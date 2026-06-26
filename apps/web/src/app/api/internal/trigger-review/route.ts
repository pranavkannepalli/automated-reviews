import { NextResponse } from "next/server";
import { z } from "zod";

import { scheduleInitialReviewRequest, scheduleReviewReminder } from "@/lib/temporal";

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
  const workflowId = `${mode}-${reviewRequestId}-${Date.now()}`;

  const scheduled =
    mode === "initial"
      ? await scheduleInitialReviewRequest({
          reviewRequestId,
          delayMinutes: directSend ? 0 : (delayMinutes ?? 0),
          workflowId,
        })
      : await scheduleReviewReminder({
          reviewRequestId,
          delayHours: directSend ? 0 : (delayHours ?? 48),
          workflowId,
        });

  if (!scheduled) {
    return NextResponse.json(
      { error: "Temporal client is not configured in this environment." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    queued: true,
    mode,
    reviewRequestId,
    directSend,
    workflowId,
  });
}
