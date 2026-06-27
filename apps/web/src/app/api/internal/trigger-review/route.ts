import { NextResponse } from "next/server";
import { z } from "zod";

import { triggerInitialReviewRequest, triggerReviewReminder } from "@/lib/internal-trigger";

const bodySchema = z.object({
  reviewRequestId: z.string().uuid(),
  mode: z.enum(["initial", "reminder"]),
  directSend: z.boolean().optional().default(false),
  delayMinutes: z.number().int().min(0).max(60 * 24).optional(),
  delayHours: z.number().int().min(0).max(24 * 14).optional(),
});

function getAuthError() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.INTERNAL_TRIGGER_SECRET?.trim();
  const providedSecret = request.headers.get("x-internal-trigger-secret")?.trim();

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return getAuthError();
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { reviewRequestId, mode, directSend, delayMinutes, delayHours } = parsed.data;

  try {
    const result =
      mode === "initial"
        ? await triggerInitialReviewRequest({
            reviewRequestId,
            delayMinutes: directSend ? 0 : (delayMinutes ?? 0),
          })
        : await triggerReviewReminder({
            reviewRequestId,
            delayHours: directSend ? 0 : (delayHours ?? 48),
          });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to queue review workflow.";
    const status = message.includes("Temporal client is not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
