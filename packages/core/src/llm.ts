import { GoogleGenAI } from "@google/genai";

import {
  buildInitialAskCopy,
  buildNegativeFollowUpCopy,
  buildPositiveFollowUpCopy,
  buildReminderFollowUpCopy,
  buildUnknownReplyCopy,
  parseFeedbackReply,
  type ParsedFeedbackReply,
  type SentimentBucket,
} from "./review";

type ReviewMessageContext = {
  organizationName: string;
};

type FollowUpContext = {
  bucket: SentimentBucket;
  trackedReviewUrl: string | null;
  customerReply: string;
  organizationName: string;
};

type ReminderContext = {
  trackedReviewUrl: string;
  organizationName: string;
};

type GeminiConfig = {
  apiKey: string | null;
  model: string;
};

const REPLY_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    score: { type: ["integer", "null"], minimum: 1, maximum: 5 },
    freeText: { type: ["string", "null"] },
    bucket: { type: "string", enum: ["positive", "negative", "unknown"] },
    reviewPromptEligible: { type: "boolean" },
  },
  required: ["score", "freeText", "bucket", "reviewPromptEligible"],
};

function getGeminiConfig(): GeminiConfig {
  return {
    apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null,
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  };
}

export function getGeminiConfigForTest() {
  return getGeminiConfig();
}

function getGeminiClient() {
  const { apiKey } = getGeminiConfig();
  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
}

function extractFirstJsonObject(input: string) {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return input.slice(start, end + 1);
}

function getInteractionText(interaction: {
  outputs?: Array<{
    type?: string;
    text?: string;
    parts?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}) {
  const text = interaction.outputs
    ?.flatMap((output) => {
      if (output.type === "text" && typeof output.text === "string") {
        return [output.text];
      }

      const parts = Array.isArray(output.parts) ? output.parts : [];
      return parts
        .map((part) =>
          typeof part === "object" &&
          part &&
          "type" in part &&
          part.type === "text" &&
          "text" in part &&
          typeof part.text === "string"
            ? part.text
            : null,
        )
        .filter((value): value is string => Boolean(value));
    })
    .join("\n")
    .trim();

  return text || null;
}

export function parseGeneratedReplyAnalysis(input: string): ParsedFeedbackReply | null {
  const json = extractFirstJsonObject(input);
  if (!json) {
    return null;
  }

  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const score =
      typeof parsed.score === "number" && Number.isInteger(parsed.score) && parsed.score >= 1 && parsed.score <= 5
        ? parsed.score
        : null;
    const freeText = typeof parsed.freeText === "string" ? parsed.freeText.trim() || null : null;
    const bucket =
      parsed.bucket === "positive" || parsed.bucket === "negative" || parsed.bucket === "unknown"
        ? parsed.bucket
        : null;
    const reviewPromptEligible =
      typeof parsed.reviewPromptEligible === "boolean" ? parsed.reviewPromptEligible : bucket === "positive";

    if (!bucket) {
      return null;
    }

    return {
      score,
      freeText,
      bucket,
      reviewPromptEligible,
    };
  } catch {
    return null;
  }
}

export function coerceGeneratedMessage(input: string, fallback: string) {
  const trimmed = input.trim();
  return trimmed || fallback;
}

async function generateText({
  systemInstruction,
  input,
}: {
  systemInstruction: string;
  input: string;
}) {
  const client = getGeminiClient();
  if (!client) {
    return null;
  }

  const response = await client.interactions.create({
    model: getGeminiConfig().model,
    system_instruction: systemInstruction,
    input,
    generation_config: {
      thinking_level: "low",
    },
  });

  return getInteractionText(response);
}

async function generateStructuredReplyAnalysis(body: string) {
  const client = getGeminiClient();
  if (!client) {
    return null;
  }

  const response = await client.interactions.create({
    model: getGeminiConfig().model,
    system_instruction:
      "Classify a customer SMS reply about a service experience. Return valid JSON that matches the provided schema.",
    input: `Customer reply: ${body}`,
    response_format: REPLY_ANALYSIS_SCHEMA,
    response_mime_type: "application/json",
  });

  return parseGeneratedReplyAnalysis(getInteractionText(response) ?? "");
}

export async function generateInitialAskMessage(context: ReviewMessageContext) {
  const fallback = buildInitialAskCopy(context.organizationName);

  try {
    const output = await generateText({
      systemInstruction:
        "Write a single SMS asking a recent customer for a 1-5 rating. Keep it under 160 characters, conversational, and do not use emojis.",
      input: `Business name: ${context.organizationName}\nFallback copy: ${fallback}`,
    });

    return output ? coerceGeneratedMessage(output, fallback) : fallback;
  } catch {
    return fallback;
  }
}

export async function analyzeReplyMessage(body: string) {
  const fallback = parseFeedbackReply(body);

  try {
    return (await generateStructuredReplyAnalysis(body)) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function generateFollowUpMessage(context: FollowUpContext) {
  const fallback =
    context.bucket === "positive" && context.trackedReviewUrl
      ? buildPositiveFollowUpCopy(context.trackedReviewUrl)
      : context.bucket === "negative"
        ? buildNegativeFollowUpCopy()
        : buildUnknownReplyCopy();

  try {
    const output = await generateText({
      systemInstruction:
        "Write a single SMS follow-up to a customer after they replied to a rating request. Keep it under 240 characters, friendly, and do not use emojis.",
      input: [
        `Business name: ${context.organizationName}`,
        `Customer reply: ${context.customerReply}`,
        `Sentiment bucket: ${context.bucket}`,
        `Tracked review URL: ${context.trackedReviewUrl ?? "none"}`,
        `Fallback copy: ${fallback}`,
      ].join("\n"),
    });

    return output ? coerceGeneratedMessage(output, fallback) : fallback;
  } catch {
    return fallback;
  }
}

export async function generateReminderMessage(context: ReminderContext) {
  const fallback = buildReminderFollowUpCopy(context.trackedReviewUrl);

  try {
    const output = await generateText({
      systemInstruction:
        "Write a single SMS reminder asking a happy customer to leave a review. Keep it under 220 characters, gentle, and do not use emojis.",
      input: [
        `Business name: ${context.organizationName}`,
        `Tracked review URL: ${context.trackedReviewUrl}`,
        `Fallback copy: ${fallback}`,
      ].join("\n"),
    });

    return output ? coerceGeneratedMessage(output, fallback) : fallback;
  } catch {
    return fallback;
  }
}
