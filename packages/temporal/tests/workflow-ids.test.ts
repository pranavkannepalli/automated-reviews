import { describe, expect, test } from "vitest";

import {
  getInitialReviewWorkflowId,
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
});
