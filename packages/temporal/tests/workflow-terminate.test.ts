import { describe, expect, test, vi } from "vitest";

import { terminateReviewRequestWorkflows } from "../src/workflow-terminate";

describe("terminateReviewRequestWorkflows", () => {
  test("terminates the initial and reminder workflows for a review request", async () => {
    const terminate = vi.fn().mockResolvedValue(undefined);

    await terminateReviewRequestWorkflows(
      "11111111-1111-1111-1111-111111111111",
      terminate,
      "bulk cleanup",
    );

    expect(terminate.mock.calls).toEqual([
      ["review-request-11111111-1111-1111-1111-111111111111", "bulk cleanup"],
      ["review-reminder-11111111-1111-1111-1111-111111111111", "bulk cleanup"],
    ]);
  });

  test("ignores workflows that are already gone", async () => {
    const terminate = vi
      .fn()
      .mockRejectedValueOnce({ name: "WorkflowNotFoundError", message: "not found" })
      .mockResolvedValueOnce(undefined);

    await expect(
      terminateReviewRequestWorkflows(
        "22222222-2222-2222-2222-222222222222",
        terminate,
        "bulk cleanup",
      ),
    ).resolves.toBeUndefined();
  });

  test("rethrows unexpected termination errors", async () => {
    const terminate = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(
      terminateReviewRequestWorkflows(
        "33333333-3333-3333-3333-333333333333",
        terminate,
        "bulk cleanup",
      ),
    ).rejects.toThrow("boom");
  });
});
