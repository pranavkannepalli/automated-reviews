import { GoogleGenAI } from "@google/genai";

import {
  buildInitialAskCopy,
  buildNegativeFollowUpCopy,
  buildNeutralAckCopy,
  buildPositiveFollowUpCopy,
  buildQuestionFallbackCopy,
  buildReminderFollowUpCopy,
  parseFeedbackReply,
  type ParsedFeedbackReply,
} from "./review";

type ReviewMessageContext = {
  organizationName: string;
};

type FollowUpContext = {
  isFeedback: boolean;
  sentiment: "positive" | "negative" | null;
  isQuestion: boolean;
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
    isFeedback: { type: "boolean" },
    sentiment: { type: ["string", "null"], enum: ["positive", "negative", null] },
    isQuestion: { type: "boolean" },
    score: { type: ["integer", "null"], minimum: 1, maximum: 5 },
    freeText: { type: ["string", "null"] },
  },
  required: ["isFeedback", "sentiment", "isQuestion", "score", "freeText"],
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
    const isFeedback = typeof parsed.isFeedback === "boolean" ? parsed.isFeedback : false;
    const sentiment = parsed.sentiment === "positive" || parsed.sentiment === "negative" ? parsed.sentiment : null;
    const isQuestion = typeof parsed.isQuestion === "boolean" ? parsed.isQuestion : false;
    const score =
      typeof parsed.score === "number" && Number.isInteger(parsed.score) && parsed.score >= 1 && parsed.score <= 5
        ? parsed.score
        : null;
    const freeText = typeof parsed.freeText === "string" ? parsed.freeText.trim() || null : null;

    if (isFeedback && !sentiment) {
      return null;
    }

    const bucket = isFeedback ? sentiment! : "unknown";

    return {
      score,
      freeText,
      bucket,
      isFeedback,
      isQuestion,
      reviewPromptEligible: bucket === "positive",
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
      "Classify a customer SMS reply to a request for feedback about their recent experience. " +
      "isFeedback: true if the reply expresses any opinion or rating about the experience, in any " +
      "form -- not just a number. sentiment: \"positive\" or \"negative\" if isFeedback is true, " +
      "otherwise null. isQuestion: true if the customer is asking something that needs answering. " +
      "score: an explicit 1-5 rating only if they gave one, otherwise null. freeText: any " +
      "descriptive text from their reply. Return valid JSON that matches the provided schema.",
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
        "Write a single SMS asking a recent customer how their experience was, in an open " +
        "conversational way -- do not ask them to reply with a number. Keep it under 160 " +
        "characters, friendly, and do not use emojis.",
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
    context.isFeedback && context.sentiment === "positive" && context.trackedReviewUrl
      ? buildPositiveFollowUpCopy(context.trackedReviewUrl)
      : context.isFeedback && context.sentiment === "negative"
        ? buildNegativeFollowUpCopy()
        : context.isQuestion
          ? buildQuestionFallbackCopy()
          : buildNeutralAckCopy();

  try {
    const output = await generateText({
      systemInstruction:
        "Write a single SMS reply in an ongoing conversation with a customer about their recent " +
        "experience. If they asked a question, answer it helpfully and concisely using the business " +
        "name (you only know the business name, so keep answers general and offer to have someone " +
        "follow up if you're not sure). If their message is positive feedback, thank them and ask if " +
        "they'd leave a review at the tracked link. If it's negative feedback, apologize and let them " +
        "know the team will follow up -- do not include the review link. Otherwise just acknowledge " +
        "warmly. Keep it under 240 characters, friendly, and do not use emojis.",
      input: [
        `Business name: ${context.organizationName}`,
        `Customer reply: ${context.customerReply}`,
        `Is feedback: ${context.isFeedback}`,
        `Sentiment: ${context.sentiment ?? "none"}`,
        `Is a question: ${context.isQuestion}`,
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
