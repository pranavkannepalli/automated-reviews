import { NativeConnection, Worker } from "@temporalio/worker";

import * as activities from "./activities";
import { getTemporalNamespace, getTemporalWorkerConnectionOptions } from "./config";
import { REVIEWS_TASK_QUEUE } from "./shared";

async function run() {
  const connection = await NativeConnection.connect(getTemporalWorkerConnectionOptions());
  const worker = await Worker.create({
    connection,
    namespace: getTemporalNamespace(),
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
