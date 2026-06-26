import { describe, expect, test } from "vitest";

import {
  coerceGeneratedMessage,
  getGeminiConfigForTest,
  parseGeneratedReplyAnalysis,
} from "../src/index";

describe("parseGeneratedReplyAnalysis", () => {
  test("parses a valid JSON reply analysis payload", () => {
    expect(
      parseGeneratedReplyAnalysis(
        '{"isFeedback":true,"sentiment":"positive","isQuestion":false,"score":5,"freeText":"Very friendly staff"}',
      ),
    ).toEqual({
      score: 5,
      freeText: "Very friendly staff",
      bucket: "positive",
      isFeedback: true,
      isQuestion: false,
      reviewPromptEligible: true,
    });
  });

  test("extracts the first JSON object from wrapped model output", () => {
    expect(
      parseGeneratedReplyAnalysis(
        'Sure, here you go:\n{"isFeedback":true,"sentiment":"negative","isQuestion":false,"score":2,"freeText":"Wait was too long"}',
      ),
    ).toEqual({
      score: 2,
      freeText: "Wait was too long",
      bucket: "negative",
      isFeedback: true,
      isQuestion: false,
      reviewPromptEligible: false,
    });
  });

  test("treats a question as not-feedback and not positive/negative", () => {
    expect(
      parseGeneratedReplyAnalysis(
        '{"isFeedback":false,"sentiment":null,"isQuestion":true,"score":null,"freeText":"What time do you close?"}',
      ),
    ).toEqual({
      score: null,
      freeText: "What time do you close?",
      bucket: "unknown",
      isFeedback: false,
      isQuestion: true,
      reviewPromptEligible: false,
    });
  });

  test("rejects payloads that claim feedback without a sentiment", () => {
    expect(parseGeneratedReplyAnalysis('{"isFeedback":true,"sentiment":null,"isQuestion":false}')).toBeNull();
  });
});

describe("coerceGeneratedMessage", () => {
  test("returns trimmed model output when present", () => {
    expect(coerceGeneratedMessage("  Thanks for coming in today.  ", "fallback")).toBe(
      "Thanks for coming in today.",
    );
  });

  test("falls back when model output is blank", () => {
    expect(coerceGeneratedMessage("   ", "fallback")).toBe("fallback");
  });
});

describe("getGeminiConfigForTest", () => {
  test("prefers GEMINI_API_KEY and GEMINI_MODEL when present", () => {
    const previousGeminiApiKey = process.env.GEMINI_API_KEY;
    const previousGoogleApiKey = process.env.GOOGLE_API_KEY;
    const previousGeminiModel = process.env.GEMINI_MODEL;

    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.GOOGLE_API_KEY = "google-key";
    process.env.GEMINI_MODEL = "gemini-2.5-flash";

    expect(getGeminiConfigForTest()).toEqual({
      apiKey: "gemini-key",
      model: "gemini-2.5-flash",
    });

    process.env.GEMINI_API_KEY = previousGeminiApiKey;
    process.env.GOOGLE_API_KEY = previousGoogleApiKey;
    process.env.GEMINI_MODEL = previousGeminiModel;
  });

  test("falls back to GOOGLE_API_KEY and default model", () => {
    const previousGeminiApiKey = process.env.GEMINI_API_KEY;
    const previousGoogleApiKey = process.env.GOOGLE_API_KEY;
    const previousGeminiModel = process.env.GEMINI_MODEL;

    delete process.env.GEMINI_API_KEY;
    process.env.GOOGLE_API_KEY = "google-key";
    delete process.env.GEMINI_MODEL;

    expect(getGeminiConfigForTest()).toEqual({
      apiKey: "google-key",
      model: "gemini-2.5-flash",
    });

    process.env.GEMINI_API_KEY = previousGeminiApiKey;
    process.env.GOOGLE_API_KEY = previousGoogleApiKey;
    process.env.GEMINI_MODEL = previousGeminiModel;
  });
});
