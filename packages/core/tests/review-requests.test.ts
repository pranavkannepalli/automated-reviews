import { describe, expect, test } from "vitest";

import { ACTIVE_REVIEW_REQUEST_STATUSES, isActiveReviewRequestStatus } from "../src/index";

describe("ACTIVE_REVIEW_REQUEST_STATUSES", () => {
  test("includes only in-flight statuses", () => {
    expect(ACTIVE_REVIEW_REQUEST_STATUSES).toEqual([
      "queued",
      "sent",
      "delivered",
      "awaiting_follow_up",
      "review_prompt_sent",
    ]);
  });
});

describe("isActiveReviewRequestStatus", () => {
  test("returns true for active review request statuses", () => {
    expect(isActiveReviewRequestStatus("queued")).toBe(true);
    expect(isActiveReviewRequestStatus("review_prompt_sent")).toBe(true);
  });

  test("returns false for terminal review request statuses", () => {
    expect(isActiveReviewRequestStatus("responded")).toBe(false);
    expect(isActiveReviewRequestStatus("review_prompt_clicked")).toBe(false);
    expect(isActiveReviewRequestStatus("draft")).toBe(false);
  });
});
