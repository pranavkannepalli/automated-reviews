import { describe, expect, test } from "vitest";

import {
  buildInitialAskCopy,
  buildPositiveFollowUpCopy,
  buildReminderFollowUpCopy,
  buildUnknownReplyCopy,
  getSentimentBucket,
  normalizeSquarePayment,
  parseFeedbackReply,
} from "../src/index";

describe("parseFeedbackReply", () => {
  test("marks 5-star replies as positive and preserves free text", () => {
    expect(parseFeedbackReply("5 Amazing service")).toEqual({
      bucket: "positive",
      freeText: "Amazing service",
      reviewPromptEligible: true,
      score: 5,
    });
  });

  test("marks scores 1-3 as recovery-needed", () => {
    expect(parseFeedbackReply("2 cold fries")).toEqual({
      bucket: "negative",
      freeText: "cold fries",
      reviewPromptEligible: false,
      score: 2,
    });
  });

  test("returns unknown when reply does not contain a score", () => {
    expect(parseFeedbackReply("pretty good")).toEqual({
      bucket: "unknown",
      freeText: "pretty good",
      reviewPromptEligible: false,
      score: null,
    });
  });
});

describe("message copy", () => {
  test("builds the initial ask with organization name", () => {
    expect(buildInitialAskCopy("Northstar Dental")).toBe(
      "Thanks for visiting Northstar Dental. How was your experience today? Reply 1-5.",
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

  test("keeps the unknown reply copy deterministic", () => {
    expect(buildUnknownReplyCopy()).toBe(
      "Thanks. Could you reply with a number from 1 to 5?",
    );
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
