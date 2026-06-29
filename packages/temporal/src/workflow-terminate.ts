import { getReviewRequestWorkflowIds } from "./shared";

export function isIgnorableWorkflowTerminateError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : "";

  return (
    name === "WorkflowNotFoundError"
    || message.includes("workflow execution already completed")
    || message.includes("workflow not found")
    || message.includes("not found")
  );
}

export async function terminateReviewRequestWorkflows(
  reviewRequestId: string,
  terminateWorkflow: (workflowId: string, reason: string) => Promise<unknown>,
  reason = "Review request cleaned up",
) {
  for (const workflowId of getReviewRequestWorkflowIds(reviewRequestId)) {
    try {
      await terminateWorkflow(workflowId, reason);
    } catch (error) {
      if (!isIgnorableWorkflowTerminateError(error)) {
        throw error;
      }
    }
  }
}
