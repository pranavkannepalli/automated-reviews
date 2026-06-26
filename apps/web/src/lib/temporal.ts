import { Client, Connection } from "@temporalio/client";
import {
  REVIEWS_TASK_QUEUE,
  getTemporalClientConnectionOptions,
  getTemporalNamespace,
  type ScheduleInitialReviewRequestInput,
  type ScheduleReviewReminderInput,
} from "@automated-reviews/temporal";

let temporalClientPromise: Promise<Client | null> | null = null;

async function getTemporalClient() {
  if (!process.env.TEMPORAL_ADDRESS) {
    return null;
  }

  if (!temporalClientPromise) {
    temporalClientPromise = Connection.connect(
      getTemporalClientConnectionOptions(),
    ).then((connection) => new Client({
      connection,
      namespace: getTemporalNamespace(),
    }));
  }

  return temporalClientPromise;
}

export async function scheduleInitialReviewRequest(input: ScheduleInitialReviewRequestInput) {
  const client = await getTemporalClient();
  if (!client) {
    return false;
  }

  await client.workflow.start("scheduleInitialReviewRequestWorkflow", {
    taskQueue: REVIEWS_TASK_QUEUE,
    workflowId: `review-request-${input.reviewRequestId}`,
    args: [input],
  });

  return true;
}

export async function scheduleReviewReminder(input: ScheduleReviewReminderInput) {
  const client = await getTemporalClient();
  if (!client) {
    return false;
  }

  await client.workflow.start("scheduleReviewReminderWorkflow", {
    taskQueue: REVIEWS_TASK_QUEUE,
    workflowId: `review-reminder-${input.reviewRequestId}`,
    args: [input],
  });

  return true;
}
