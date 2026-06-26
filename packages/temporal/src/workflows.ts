import { proxyActivities, sleep } from "@temporalio/workflow";

import type { ScheduleInitialReviewRequestInput, ScheduleReviewReminderInput } from "./shared";

const activities = proxyActivities<{
  sendInitialReviewRequest(reviewRequestId: string): Promise<{ provider: "twilio" | "beeper" | null }>;
  sendReviewReminderIfNeeded(reviewRequestId: string): Promise<void>;
}>({
  startToCloseTimeout: "5 minutes",
  retry: {
    maximumAttempts: 5,
  },
});

const pollingActivities = proxyActivities<{
  checkBeeperReplies(reviewRequestId: string): Promise<{ done: boolean }>;
}>({
  startToCloseTimeout: "30 seconds",
  retry: {
    maximumAttempts: 3,
  },
});

// Beeper has no inbound webhook (only a WS live-events stream), so once the
// initial ask goes out over Beeper, the worker pings the Beeper Desktop API
// on a 1-minute timer to pick up replies instead of waiting for a push.
// Capped at 24h of polling so this stays well under Temporal's recommended
// per-workflow history size -- a stopgap until Twilio numbers are verified.
const MAX_BEEPER_POLLS = 24 * 60;

export async function scheduleInitialReviewRequestWorkflow(input: ScheduleInitialReviewRequestInput) {
  if (input.delayMinutes > 0) {
    await sleep(`${input.delayMinutes} minutes`);
  }

  const { provider } = await activities.sendInitialReviewRequest(input.reviewRequestId);

  if (provider === "beeper") {
    for (let i = 0; i < MAX_BEEPER_POLLS; i += 1) {
      await sleep("1 minute");
      const { done } = await pollingActivities.checkBeeperReplies(input.reviewRequestId);
      if (done) {
        break;
      }
    }
  }
}

export async function scheduleReviewReminderWorkflow(input: ScheduleReviewReminderInput) {
  if (input.delayHours > 0) {
    await sleep(`${input.delayHours} hours`);
  }

  await activities.sendReviewReminderIfNeeded(input.reviewRequestId);
}
