import { describe, expect, test } from "vitest";

import { getDemoProcessSquareWebhookOptions } from "../src/demo-flow";

describe("getDemoProcessSquareWebhookOptions", () => {
  test("schedules demo outreach through Temporal immediately instead of forcing an inline send", () => {
    expect(getDemoProcessSquareWebhookOptions()).toEqual({
      forceImmediateSend: false,
      delayMinutesOverride: 0,
    });
  });
});
