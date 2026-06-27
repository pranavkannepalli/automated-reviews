import {
  buildInitialReviewTriggerRequest,
  buildReminderTriggerRequest,
} from "@automated-reviews/core";

import { getInternalAppUrl } from "./env";
import { scheduleInitialReviewRequest, scheduleReviewReminder } from "./temporal";

type InitialTriggerInput = {
  reviewRequestId: string;
  delayMinutes: number;
};

type ReminderTriggerInput = {
  reviewRequestId: string;
  delayHours: number;
};

function buildWorkflowId(mode: "initial" | "reminder", reviewRequestId: string) {
  return `${mode}-${reviewRequestId}-${Date.now()}`;
}

export async function triggerInitialReviewRequest({
  reviewRequestId,
  delayMinutes,
}: InitialTriggerInput) {
  const workflowId = buildWorkflowId("initial", reviewRequestId);
  const queued = await scheduleInitialReviewRequest({
    reviewRequestId,
    delayMinutes,
    workflowId,
  });

  if (!queued) {
    throw new Error("Temporal client is not configured in this environment.");
  }

  return {
    queued: true,
    mode: "initial" as const,
    reviewRequestId,
    directSend: false,
    workflowId,
  };
}

export async function triggerReviewReminder({
  reviewRequestId,
  delayHours,
}: ReminderTriggerInput) {
  const workflowId = buildWorkflowId("reminder", reviewRequestId);
  const queued = await scheduleReviewReminder({
    reviewRequestId,
    delayHours,
    workflowId,
  });

  if (!queued) {
    throw new Error("Temporal client is not configured in this environment.");
  }

  return {
    queued: true,
    mode: "reminder" as const,
    reviewRequestId,
    directSend: false,
    workflowId,
  };
}

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

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    throw new Error(`Internal trigger API returned non-JSON success payload: ${text.slice(0, 500)}`);
  }

  return response.json();
}

export async function triggerInitialReviewRequestViaApi({
  reviewRequestId,
  delayMinutes,
}: InitialTriggerInput) {
  return postInternalTrigger(buildInitialReviewTriggerRequest({ reviewRequestId, delayMinutes }));
}

export async function triggerReviewReminderViaApi({
  reviewRequestId,
  delayHours,
}: ReminderTriggerInput) {
  return postInternalTrigger(buildReminderTriggerRequest({ reviewRequestId, delayHours }));
}
