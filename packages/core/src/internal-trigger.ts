export function buildInitialReviewTriggerRequest({
  reviewRequestId,
  delayMinutes,
}: {
  reviewRequestId: string;
  delayMinutes: number;
}) {
  return {
    mode: "initial" as const,
    reviewRequestId,
    directSend: false,
    delayMinutes,
  };
}

export function buildReminderTriggerRequest({
  reviewRequestId,
  delayHours,
}: {
  reviewRequestId: string;
  delayHours: number;
}) {
  return {
    mode: "reminder" as const,
    reviewRequestId,
    directSend: false,
    delayHours,
  };
}
