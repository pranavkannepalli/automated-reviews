import { describe, expect, test } from "vitest";

import {
  buildInitialReviewTriggerRequest,
  buildReminderTriggerRequest,
} from "../src/internal-trigger";

describe("buildInitialReviewTriggerRequest", () => {
  test("builds the internal API payload for an immediate Temporal kickoff", () => {
    expect(
      buildInitialReviewTriggerRequest({
        reviewRequestId: "11111111-1111-1111-1111-111111111111",
        delayMinutes: 0,
      }),
    ).toEqual({
      mode: "initial",
      reviewRequestId: "11111111-1111-1111-1111-111111111111",
      directSend: false,
      delayMinutes: 0,
    });
  });
});

describe("buildReminderTriggerRequest", () => {
  test("builds the internal API payload for reminder scheduling", () => {
    expect(
      buildReminderTriggerRequest({
        reviewRequestId: "22222222-2222-2222-2222-222222222222",
        delayHours: 48,
      }),
    ).toEqual({
      mode: "reminder",
      reviewRequestId: "22222222-2222-2222-2222-222222222222",
      directSend: false,
      delayHours: 48,
    });
  });
});
