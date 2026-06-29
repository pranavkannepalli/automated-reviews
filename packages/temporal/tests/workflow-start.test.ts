import { describe, expect, test, vi } from "vitest";

import { startWorkflowOnce } from "../src/workflow-start";

describe("startWorkflowOnce", () => {
  test("runs the workflow start function", async () => {
    const start = vi.fn().mockResolvedValue({ runId: "run-1" });

    await expect(startWorkflowOnce(start)).resolves.toEqual({ runId: "run-1" });
    expect(start).toHaveBeenCalledTimes(1);
  });

  test("swallows duplicate workflow start errors", async () => {
    const start = vi.fn().mockRejectedValue({
      name: "WorkflowExecutionAlreadyStartedError",
      message: "Workflow execution already started",
    });

    await expect(startWorkflowOnce(start)).resolves.toBeUndefined();
    expect(start).toHaveBeenCalledTimes(1);
  });

  test("rethrows unexpected workflow start errors", async () => {
    const start = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(startWorkflowOnce(start)).rejects.toThrow("boom");
  });
});
