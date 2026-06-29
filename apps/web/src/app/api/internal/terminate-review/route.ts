import { NextResponse } from "next/server";
import { z } from "zod";

import { terminateReviewRequestWorkflows } from "@/lib/temporal";

const bodySchema = z.object({
  reviewRequestId: z.string().uuid(),
  reason: z.string().trim().min(1).max(500).optional(),
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

  try {
    const workflowIds = await terminateReviewRequestWorkflows(
      parsed.data.reviewRequestId,
      parsed.data.reason ?? "Internal workflow termination requested.",
    );

    return NextResponse.json({
      ok: true,
      reviewRequestId: parsed.data.reviewRequestId,
      workflowIds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to terminate review workflow.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
