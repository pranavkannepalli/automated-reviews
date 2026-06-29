export async function startWorkflowOnce<T>(start: () => Promise<T>) {
  try {
    return await start();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "WorkflowExecutionAlreadyStartedError"
    ) {
      return undefined;
    }

    throw error;
  }
}
