import { describe, expect, test } from "vitest";

import {
  getNextBeeperInboundReply,
  isBeeperPollingTerminalStatus,
} from "../src/beeper-replies";

describe("getNextBeeperInboundReply", () => {
  test("returns only the earliest unseen inbound message with text", () => {
    const reply = getNextBeeperInboundReply(
      [
        { id: "sender", isSender: true, timestamp: "2026-06-29T19:02:48.000Z", text: "outbound" },
        { id: "later", isSender: false, timestamp: "2026-06-29T19:02:50.000Z", text: "later reply" },
        { id: "first", isSender: false, timestamp: "2026-06-29T19:02:49.000Z", text: "first reply" },
      ],
      new Set(),
    );

    expect(reply).toMatchObject({ id: "first", text: "first reply" });
  });

  test("skips already seen inbound messages", () => {
    const reply = getNextBeeperInboundReply(
      [
        { id: "seen", isSender: false, timestamp: "2026-06-29T19:02:49.000Z", text: "seen reply" },
        { id: "fresh", isSender: false, timestamp: "2026-06-29T19:02:50.000Z", text: "fresh reply" },
      ],
      new Set(["seen"]),
    );

    expect(reply).toMatchObject({ id: "fresh", text: "fresh reply" });
  });

  test("returns null when nothing usable is left", () => {
    const reply = getNextBeeperInboundReply(
      [
        { id: "seen", isSender: false, timestamp: "2026-06-29T19:02:49.000Z", text: "seen reply" },
        { id: "empty", isSender: false, timestamp: "2026-06-29T19:02:50.000Z" },
      ],
      new Set(["seen"]),
    );

    expect(reply).toBeNull();
  });
});

describe("isBeeperPollingTerminalStatus", () => {
  test("stops polling once the request is awaiting follow up", () => {
    expect(isBeeperPollingTerminalStatus("awaiting_follow_up")).toBe(true);
  });

  test("stops polling once the request has a terminal reply state", () => {
    expect(isBeeperPollingTerminalStatus("responded")).toBe(true);
    expect(isBeeperPollingTerminalStatus("review_prompt_sent")).toBe(true);
  });

  test("keeps polling while the initial ask is still open", () => {
    expect(isBeeperPollingTerminalStatus("sent")).toBe(false);
    expect(isBeeperPollingTerminalStatus("delivered")).toBe(false);
    expect(isBeeperPollingTerminalStatus("queued")).toBe(false);
  });
});
