#!/usr/bin/env -S pnpm exec tsx
// End-to-end Temporal workflow test, no website involved.
//
// Seeds a minimal valid org/customer/payment/review-request via the
// Supabase service role key, then starts scheduleInitialReviewRequestWorkflow
// against whatever Temporal deployment TEMPORAL_ADDRESS/TEMPORAL_API_KEY
// point at -- local dev server or Temporal Cloud, same as the real worker.
// A worker must already be polling the "automated-reviews" task queue for
// the workflow to actually run.
//
// Usage:
//   pnpm --filter @automated-reviews/temporal test:workflow +15551234567
//
// Reads Supabase + Temporal env from apps/web/.env.local (see package.json).

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Client, Connection } from "@temporalio/client";
import { getTemporalClientConnectionOptions, getTemporalNamespace } from "../src/config";
import { REVIEWS_TASK_QUEUE } from "../src/shared";

const phone = process.argv[2];
if (!phone) {
  console.error("Usage: pnpm --filter @automated-reviews/temporal test:workflow <phone-e164>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  const suffix = randomUUID().slice(0, 8);

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: `Workflow Test Org ${suffix}`,
      slug: `workflow-test-${suffix}`,
      is_test: true,
      environment: "local_test",
    })
    .select()
    .single();
  if (orgError) throw orgError;

  const { error: settingsError } = await supabase.from("organization_settings").insert({
    organization_id: organization.id,
    auto_send_enabled: true,
    is_test: true,
    environment: "local_test",
  });
  if (settingsError) throw settingsError;

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      organization_id: organization.id,
      phone,
      first_name: "Workflow",
      last_name: "Test Customer",
      is_test: true,
      environment: "local_test",
    })
    .select()
    .single();
  if (customerError) throw customerError;

  const { data: paymentEvent, error: paymentError } = await supabase
    .from("payment_events")
    .insert({
      organization_id: organization.id,
      customer_id: customer.id,
      source: "manual_test",
      source_payment_id: `test-payment-${suffix}`,
      amount: 1000,
      phone,
      is_test: true,
      environment: "local_test",
    })
    .select()
    .single();
  if (paymentError) throw paymentError;

  const { data: reviewRequest, error: reviewRequestError } = await supabase
    .from("review_requests")
    .insert({
      organization_id: organization.id,
      customer_id: customer.id,
      payment_event_id: paymentEvent.id,
      status: "queued",
      tracking_token: randomUUID(),
      is_test: true,
      environment: "local_test",
    })
    .select()
    .single();
  if (reviewRequestError) throw reviewRequestError;

  return { organization, reviewRequest };
}

async function startWorkflow(reviewRequestId: string) {
  const connection = await Connection.connect(getTemporalClientConnectionOptions());
  const client = new Client({ connection, namespace: getTemporalNamespace() });

  const workflowId = `test-initial-review-request-${reviewRequestId}`;
  const handle = await client.workflow.start("scheduleInitialReviewRequestWorkflow", {
    taskQueue: REVIEWS_TASK_QUEUE,
    workflowId,
    args: [{ reviewRequestId, delayMinutes: 0 }],
  });

  console.log(`Started workflow ${workflowId}, waiting for a worker to pick it up ...`);
  await handle.result();
  console.log("Workflow completed.");

  await connection.close();
}

async function reportMessageEvents(reviewRequestId: string) {
  const { data: events, error } = await supabase
    .from("message_events")
    .select("*")
    .eq("review_request_id", reviewRequestId)
    .order("occurred_at", { ascending: true });
  if (error) throw error;

  console.log("message_events:");
  for (const event of events ?? []) {
    console.log(`  [${event.occurred_at}] ${event.provider} ${event.message_type} -> ${event.status}`);
  }
}

async function main() {
  console.log("Seeding test organization/customer/payment/review-request ...");
  const { reviewRequest } = await seed();
  console.log(`Seeded review_request ${reviewRequest.id}`);

  await startWorkflow(reviewRequest.id);
  await reportMessageEvents(reviewRequest.id);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
