import { describe, expect, test } from "vitest";

import {
  buildBeeperStartChatInput,
  getBeeperPendingMessageId,
  pickBeeperAccountID,
} from "../src/beeper";

describe("pickBeeperAccountID", () => {
  test("prefers the explicitly configured account when it exists", () => {
    expect(
      pickBeeperAccountID(
        [
          { accountID: "whatsapp", network: "WhatsApp", status: "connected" },
          { accountID: "instagramgo", network: "Instagram", status: "connected" },
        ],
        "instagramgo",
      ),
    ).toBe("instagramgo");
  });

  test("falls back to the connected WhatsApp account when no override is set", () => {
    expect(
      pickBeeperAccountID([
        { accountID: "matrix", network: "Beeper", status: "connected" },
        { accountID: "whatsapp", network: "WhatsApp", status: "connected" },
      ]),
    ).toBe("whatsapp");
  });

  test("returns null when no usable account matches", () => {
    expect(
      pickBeeperAccountID([
        { accountID: "matrix", network: "Beeper", status: "connected" },
        { accountID: "instagramgo", network: "Instagram", status: "disconnected" },
      ]),
    ).toBeNull();
  });
});

describe("buildBeeperStartChatInput", () => {
  test("builds the v5 direct chat payload", () => {
    expect(buildBeeperStartChatInput("+15550101001", "whatsapp")).toEqual({
      accountID: "whatsapp",
      user: {
        phoneNumber: "+15550101001",
      },
    });
  });
});

describe("getBeeperPendingMessageId", () => {
  test("reads pendingMessageID from the current Beeper API", () => {
    expect(
      getBeeperPendingMessageId({
        pendingMessageID: "pending-123",
      }),
    ).toBe("pending-123");
  });

  test("falls back to legacy messageID responses", () => {
    expect(
      getBeeperPendingMessageId({
        messageID: "legacy-123",
      }),
    ).toBe("legacy-123");
  });
});
