import { describe, expect, test } from "vitest";

import { getDemoProcessSquareWebhookOptions } from "../src/demo-flow";

describe("getDemoProcessSquareWebhookOptions", () => {
  test("schedules demo outreach through Temporal instead of forcing an immediate send", () => {
    expect(getDemoProcessSquareWebhookOptions()).toEqual({
      forceImmediateSend: false,
    });
  });
});
