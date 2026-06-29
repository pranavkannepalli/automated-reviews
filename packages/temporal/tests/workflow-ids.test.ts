import { describe, expect, test } from "vitest";

import {
  getInitialReviewWorkflowId,
  getReviewRequestWorkflowIds,
  getReviewReminderWorkflowId,
} from "../src/shared";

describe("workflow ids", () => {
  test("uses a stable workflow id for initial review requests", () => {
    expect(getInitialReviewWorkflowId("11111111-1111-1111-1111-111111111111")).toBe(
      "review-request-11111111-1111-1111-1111-111111111111",
    );
  });

  test("uses a stable workflow id for reminder requests", () => {
    expect(getReviewReminderWorkflowId("22222222-2222-2222-2222-222222222222")).toBe(
      "review-reminder-22222222-2222-2222-2222-222222222222",
    );
  });

  test("returns both workflow ids for a review request", () => {
    expect(getReviewRequestWorkflowIds("33333333-3333-3333-3333-333333333333")).toEqual([
      "review-request-33333333-3333-3333-3333-333333333333",
      "review-reminder-33333333-3333-3333-3333-333333333333",
    ]);
  });
});
