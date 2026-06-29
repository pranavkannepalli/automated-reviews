export const ACTIVE_REVIEW_REQUEST_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "awaiting_follow_up",
  "review_prompt_sent",
] as const;

export function isActiveReviewRequestStatus(status: string) {
  return ACTIVE_REVIEW_REQUEST_STATUSES.includes(
    status as (typeof ACTIVE_REVIEW_REQUEST_STATUSES)[number],
  );
}
