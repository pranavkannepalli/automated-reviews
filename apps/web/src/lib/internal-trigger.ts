import {
  buildInitialReviewTriggerRequest,
  buildReminderTriggerRequest,
} from "@automated-reviews/core";

import { getInternalAppUrl } from "./env";

async function postInternalTrigger(body: Record<string, unknown>) {
  const secret = process.env.INTERNAL_TRIGGER_SECRET?.trim();
  if (!secret) {
    throw new Error("INTERNAL_TRIGGER_SECRET is required to trigger Temporal through the internal API.");
  }

  const response = await fetch(`${getInternalAppUrl()}/api/internal/trigger-review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-trigger-secret": secret,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Internal trigger API failed with ${response.status}: ${text}`);
  }

  return response.json();
}

export async function triggerInitialReviewRequestViaApi({
  reviewRequestId,
  delayMinutes,
}: {
  reviewRequestId: string;
  delayMinutes: number;
}) {
  return postInternalTrigger(buildInitialReviewTriggerRequest({ reviewRequestId, delayMinutes }));
}

export async function triggerReviewReminderViaApi({
  reviewRequestId,
  delayHours,
}: {
  reviewRequestId: string;
  delayHours: number;
}) {
  return postInternalTrigger(buildReminderTriggerRequest({ reviewRequestId, delayHours }));
}
