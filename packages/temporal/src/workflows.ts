import { proxyActivities, sleep } from "@temporalio/workflow";

import type { ScheduleInitialReviewRequestInput, ScheduleReviewReminderInput } from "./shared";

const activities = proxyActivities<{
  sendInitialReviewRequest(reviewRequestId: string): Promise<void>;
  sendReviewReminderIfNeeded(reviewRequestId: string): Promise<void>;
}>({
  startToCloseTimeout: "5 minutes",
  retry: {
    maximumAttempts: 5,
  },
});

export async function scheduleInitialReviewRequestWorkflow(input: ScheduleInitialReviewRequestInput) {
  if (input.delayMinutes > 0) {
    await sleep(`${input.delayMinutes} minutes`);
  }

  await activities.sendInitialReviewRequest(input.reviewRequestId);
}

export async function scheduleReviewReminderWorkflow(input: ScheduleReviewReminderInput) {
  if (input.delayHours > 0) {
    await sleep(`${input.delayHours} hours`);
  }

  await activities.sendReviewReminderIfNeeded(input.reviewRequestId);
}
