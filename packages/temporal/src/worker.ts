import { NativeConnection, Worker } from "@temporalio/worker";

import * as activities from "./activities";
import { REVIEWS_TASK_QUEUE } from "./shared";

async function run() {
  const address = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
  const connection = await NativeConnection.connect({ address });
  const worker = await Worker.create({
    connection,
    workflowsPath: new URL("./workflows.ts", import.meta.url).pathname,
    activities,
    taskQueue: REVIEWS_TASK_QUEUE,
  });

  await worker.run();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
