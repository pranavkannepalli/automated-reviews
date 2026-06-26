export const REVIEWS_TASK_QUEUE = "automated-reviews";

export type ScheduleInitialReviewRequestInput = {
  reviewRequestId: string;
  delayMinutes: number;
  workflowId?: string;
};

export type ScheduleReviewReminderInput = {
  reviewRequestId: string;
  delayHours: number;
  workflowId?: string;
};
