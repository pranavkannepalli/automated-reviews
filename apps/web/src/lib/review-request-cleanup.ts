import { isActiveReviewRequestStatus } from "@automated-reviews/core";

import { createSupabaseAdminClient } from "./supabase";

export async function markReviewRequestWorkflowTerminated(
  reviewRequestId: string,
  reason = "Temporal workflow terminated.",
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("mark_review_request_workflow_terminated", {
    input_review_request_id: reviewRequestId,
    input_cleanup_reason: reason,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function bulkTerminateActiveReviewRequests(
  reason = "Bulk review workflow cleanup.",
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("bulk_terminate_active_review_requests", {
    input_cleanup_reason: reason,
  });

  if (error) {
    throw error;
  }

  return Number(data ?? 0);
}

export async function cleanupReviewRequestIfActive(reviewRequestId: string, reason?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createSupabaseAdminClient();
  const { data: reviewRequest, error } = await supabase
    .from("review_requests")
    .select("status")
    .eq("id", reviewRequestId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!reviewRequest?.status || !isActiveReviewRequestStatus(reviewRequest.status)) {
    return false;
  }

  return markReviewRequestWorkflowTerminated(reviewRequestId, reason);
}
