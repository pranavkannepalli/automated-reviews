import { describe, expect, test } from "vitest";

import { claimInboundBeeperMessage } from "../src/message-events";

function buildSupabaseInsertStub(result: { error: null | { code?: string; message?: string } }) {
  return {
    from(table: string) {
      expect(table).toBe("message_events");

      return {
        insert(payload: Record<string, unknown>) {
          expect(payload.provider).toBe("beeper");
          expect(payload.direction).toBe("inbound");
          return Promise.resolve(result);
        },
      };
    },
  };
}

describe("claimInboundBeeperMessage", () => {
  test("claims a new inbound Beeper message", async () => {
    const claimed = await claimInboundBeeperMessage(
      buildSupabaseInsertStub({ error: null }),
      {
        review_request_id: "11111111-1111-1111-1111-111111111111",
        provider: "beeper",
        provider_message_sid: "msg-1",
        direction: "inbound",
      },
    );

    expect(claimed).toBe(true);
  });

  test("returns false when the inbound Beeper message was already claimed", async () => {
    const claimed = await claimInboundBeeperMessage(
      buildSupabaseInsertStub({ error: { code: "23505", message: "duplicate key value" } }),
      {
        review_request_id: "11111111-1111-1111-1111-111111111111",
        provider: "beeper",
        provider_message_sid: "msg-1",
        direction: "inbound",
      },
    );

    expect(claimed).toBe(false);
  });

  test("throws unexpected insert errors", async () => {
    await expect(
      claimInboundBeeperMessage(
        buildSupabaseInsertStub({ error: { code: "57014", message: "statement timeout" } }),
        {
          review_request_id: "11111111-1111-1111-1111-111111111111",
          provider: "beeper",
          provider_message_sid: "msg-1",
          direction: "inbound",
        },
      ),
    ).rejects.toMatchObject({ code: "57014" });
  });
});
