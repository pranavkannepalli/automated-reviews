import { describe, expect, test } from "vitest";

import {
  buildInitialAskCopy,
  buildNeutralAckCopy,
  buildPositiveFollowUpCopy,
  buildQuestionFallbackCopy,
  buildReminderFollowUpCopy,
  getSentimentBucket,
  normalizeSquarePayment,
  parseFeedbackReply,
} from "../src/index";

describe("parseFeedbackReply", () => {
  test("marks 5-star replies as positive and preserves free text", () => {
    expect(parseFeedbackReply("5 Amazing service")).toEqual({
      bucket: "positive",
      freeText: "Amazing service",
      isFeedback: true,
      isQuestion: false,
      reviewPromptEligible: true,
      score: 5,
    });
  });

  test("marks scores 1-3 as recovery-needed", () => {
    expect(parseFeedbackReply("2 cold fries")).toEqual({
      bucket: "negative",
      freeText: "cold fries",
      isFeedback: true,
      isQuestion: false,
      reviewPromptEligible: false,
      score: 2,
    });
  });

  test("recognizes free-text positive feedback without a score", () => {
    expect(parseFeedbackReply("pretty good")).toEqual({
      bucket: "positive",
      freeText: "pretty good",
      isFeedback: true,
      isQuestion: false,
      reviewPromptEligible: true,
      score: null,
    });
  });

  test("flags a question and does not treat it as feedback", () => {
    expect(parseFeedbackReply("what are your hours?")).toEqual({
      bucket: "unknown",
      freeText: "what are your hours?",
      isFeedback: false,
      isQuestion: true,
      reviewPromptEligible: false,
      score: null,
    });
  });

  test("returns unknown when reply has no sentiment signal", () => {
    expect(parseFeedbackReply("ok")).toEqual({
      bucket: "unknown",
      freeText: "ok",
      isFeedback: false,
      isQuestion: false,
      reviewPromptEligible: false,
      score: null,
    });
  });
});

describe("message copy", () => {
  test("builds the initial ask with organization name", () => {
    expect(buildInitialAskCopy("Northstar Dental")).toBe(
      "Thanks for visiting Northstar Dental! How did everything go?",
    );
  });

  test("builds the positive follow-up with review url", () => {
    expect(buildPositiveFollowUpCopy("https://google.com/review")).toBe(
      "Glad to hear it. Would you mind leaving a quick review? https://google.com/review",
    );
  });

  test("builds a reminder follow-up with review url", () => {
    expect(buildReminderFollowUpCopy("https://google.com/review")).toBe(
      "Just a quick reminder in case you missed it. We'd love your review: https://google.com/review",
    );
  });

  test("keeps the question fallback copy deterministic", () => {
    expect(buildQuestionFallbackCopy()).toBe(
      "Thanks for asking -- someone from our team will get back to you shortly.",
    );
  });

  test("keeps the neutral ack copy deterministic", () => {
    expect(buildNeutralAckCopy()).toBe("Thanks for letting us know!");
  });
});

describe("getSentimentBucket", () => {
  test("maps score boundaries correctly", () => {
    expect(getSentimentBucket(1)).toBe("negative");
    expect(getSentimentBucket(3)).toBe("negative");
    expect(getSentimentBucket(4)).toBe("positive");
    expect(getSentimentBucket(5)).toBe("positive");
  });
});

describe("normalizeSquarePayment", () => {
  test("normalizes a square payment payload into the app payment shape", () => {
    const normalized = normalizeSquarePayment({
      type: "payment.created",
      event_id: "evt_123",
      created_at: "2026-06-25T10:00:00.000Z",
      data: {
        object: {
          payment: {
            id: "pay_123",
            status: "COMPLETED",
            amount_money: {
              amount: 3850,
              currency: "USD",
            },
            location_id: "loc_123",
            buyer_email_address: "guest@example.com",
            customer_details: {
              given_name: "Sasha",
              family_name: "Pike",
              phone_number: "+14155550123",
            },
          },
        },
      },
    });

    expect(normalized).toEqual({
      amount: 3850,
      currency: "USD",
      firstName: "Sasha",
      lastName: "Pike",
      occurredAt: "2026-06-25T10:00:00.000Z",
      phone: "+14155550123",
      source: "square",
      sourceLocationId: "loc_123",
      sourcePaymentId: "pay_123",
      status: "completed",
    });
  });
});
