import {
  analyzeReplyMessage,
  generateFollowUpMessage,
  generateInitialAskMessage,
  generateReminderMessage,
} from "@automated-reviews/core";
import { createClient } from "@supabase/supabase-js";
import { Client, Connection } from "@temporalio/client";
import twilio from "twilio";

import { getTemporalClientConnectionOptions, getTemporalNamespace } from "./config";
import { REVIEWS_TASK_QUEUE } from "./shared";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const beeperAccessToken = process.env.BEEPER_ACCESS_TOKEN;
const beeperApiUrl = process.env.BEEPER_API_URL ?? "http://127.0.0.1:23373";
const beeperAccountId = process.env.BEEPER_ACCOUNT_ID;

function hasBeeperEnv() {
  return Boolean(beeperAccessToken);
}

function beeperHeaders() {
  if (!beeperAccessToken) {
    throw new Error("BEEPER_ACCESS_TOKEN is required to talk to Beeper.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${beeperAccessToken}`,
  };
}

// "start" is idempotent on Beeper's side -- it returns the existing direct
// chat with this phone number if there is one, rather than creating a
// duplicate, so it's safe to call on every send and every poll.
async function startBeeperChat(phoneNumber: string) {
  const response = await fetch(`${beeperApiUrl}/v1/chats`, {
    method: "POST",
    headers: beeperHeaders(),
    body: JSON.stringify({
      mode: "start",
      phoneNumber,
      ...(beeperAccountId ? { accountID: beeperAccountId } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Beeper chat lookup failed with ${response.status}`);
  }

  return response.json() as Promise<{ chatID: string }>;
}

// Sends from the owner's own bridged number via Beeper Desktop, as a
// stand-in until Twilio numbers are verified for an organization.
async function sendBeeperMessage(to: string, body: string) {
  const chat = await startBeeperChat(to);

  const messageResponse = await fetch(`${beeperApiUrl}/v1/chats/${chat.chatID}/messages`, {
    method: "POST",
    headers: beeperHeaders(),
    body: JSON.stringify({ text: body }),
  });

  if (!messageResponse.ok) {
    throw new Error(`Beeper send failed with ${messageResponse.status}`);
  }

  const message = await messageResponse.json();
  return { sid: (message.messageID as string | undefined) ?? null, status: "sent" };
}

type BeeperMessage = {
  id: string;
  isSender: boolean;
  timestamp: string;
  text?: string;
};

// Beeper has no inbound webhook, only a WS live-events stream, so replies
// are picked up by polling this on a loop from checkBeeperReplies instead.
async function listBeeperMessages(chatID: string): Promise<BeeperMessage[]> {
  const response = await fetch(`${beeperApiUrl}/v1/chats/${chatID}/messages`, {
    headers: beeperHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Beeper message list failed with ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

let temporalClientPromise: Promise<Client> | null = null;

function getTemporalClient() {
  if (!temporalClientPromise) {
    temporalClientPromise = Connection.connect(getTemporalClientConnectionOptions()).then(
      (connection) => new Client({ connection, namespace: getTemporalNamespace() }),
    );
  }

  return temporalClientPromise;
}

async function scheduleReviewReminder(reviewRequestId: string) {
  const client = await getTemporalClient();
  await client.workflow.start("scheduleReviewReminderWorkflow", {
    taskQueue: REVIEWS_TASK_QUEUE,
    workflowId: `review-reminder-${reviewRequestId}`,
    args: [{ reviewRequestId, delayHours: 48 }],
  });
}

function getSupabase() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase env is required for Temporal activities.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getTwilioClient(accountSid: string) {
  if (!twilioAuthToken) {
    throw new Error("TWILIO_AUTH_TOKEN is required for Temporal activities.");
  }

  return twilio(accountSid, twilioAuthToken);
}

async function getRequestBundle(reviewRequestId: string) {
  const supabase: any = getSupabase();
  const { data: reviewRequest, error: reviewRequestError } = await supabase
    .from("review_requests")
    .select("*")
    .eq("id", reviewRequestId)
    .maybeSingle();

  if (reviewRequestError) {
    throw reviewRequestError;
  }

  if (!reviewRequest) {
    throw new Error(`Review request ${reviewRequestId} not found.`);
  }

  const [{ data: organization }, { data: settings }, { data: customer }, { data: feedback }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", reviewRequest.organization_id).maybeSingle(),
    supabase.from("organization_settings").select("*").eq("organization_id", reviewRequest.organization_id).maybeSingle(),
    reviewRequest.customer_id
      ? supabase.from("customers").select("*").eq("id", reviewRequest.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("feedback_responses")
      .select("*")
      .eq("review_request_id", reviewRequest.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    supabase,
    reviewRequest,
    organization,
    settings,
    customer,
    feedback,
  };
}

async function insertMessageEvent(supabase: any, payload: Record<string, unknown>) {
  await supabase.from("message_events").insert(payload);
}

export async function sendInitialReviewRequest(
  reviewRequestId: string,
): Promise<{ provider: "twilio" | "beeper" | null }> {
  const { supabase, reviewRequest, organization, settings, customer } = await getRequestBundle(reviewRequestId);

  const canSendViaTwilio = Boolean(settings?.twilio_account_sid && settings?.twilio_phone_number);

  if (!settings?.auto_send_enabled || !customer?.phone || (!canSendViaTwilio && !hasBeeperEnv())) {
    return { provider: null };
  }

  const provider = canSendViaTwilio ? "twilio" : "beeper";
  const body = await generateInitialAskMessage({ organizationName: organization.name });

  await insertMessageEvent(supabase, {
    organization_id: reviewRequest.organization_id,
    review_request_id: reviewRequest.id,
    payment_event_id: reviewRequest.payment_event_id,
    customer_id: reviewRequest.customer_id,
    provider,
    direction: "outbound",
    message_type: "sms_send_attempted",
    status: "attempted",
    message_body: body,
    occurred_at: new Date().toISOString(),
  });

  const message =
    provider === "twilio"
      ? await getTwilioClient(settings.twilio_account_sid).messages.create({
          body,
          from: settings.twilio_phone_number,
          to: customer.phone,
          statusCallback: `${appUrl}/api/webhooks/twilio?reviewRequestId=${reviewRequest.id}`,
        })
      : await sendBeeperMessage(customer.phone, body);

  await supabase
    .from("review_requests")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", reviewRequest.id);

  await insertMessageEvent(supabase, {
    organization_id: reviewRequest.organization_id,
    review_request_id: reviewRequest.id,
    payment_event_id: reviewRequest.payment_event_id,
    customer_id: reviewRequest.customer_id,
    provider,
    provider_message_sid: message.sid,
    direction: "outbound",
    message_type: "sms_sent",
    status: message.status ?? "sent",
    message_body: body,
    occurred_at: new Date().toISOString(),
  });

  return { provider };
}

// Beeper has no inbound webhook, so scheduleInitialReviewRequestWorkflow
// calls this on a 1-minute timer loop (only when the initial ask went out
// via Beeper) instead of waiting for a push notification like Twilio gets.
// Returns done:true once the conversation reaches a terminal state, so the
// workflow can stop polling.
export async function checkBeeperReplies(reviewRequestId: string): Promise<{ done: boolean }> {
  if (!hasBeeperEnv()) {
    return { done: true };
  }

  const { supabase, reviewRequest, organization, settings, customer } = await getRequestBundle(reviewRequestId);

  if (!customer?.phone || ["responded", "review_prompt_sent"].includes(reviewRequest.status)) {
    return { done: true };
  }

  const chat = await startBeeperChat(customer.phone);
  const messages = await listBeeperMessages(chat.chatID);

  const { data: seenRows } = await supabase
    .from("message_events")
    .select("provider_message_sid")
    .eq("review_request_id", reviewRequestId)
    .eq("provider", "beeper")
    .eq("direction", "inbound");
  const seenIds = new Set((seenRows ?? []).map((row: any) => row.provider_message_sid).filter(Boolean));

  const newInbound = messages
    .filter((message) => !message.isSender && message.text && !seenIds.has(message.id))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const message of newInbound) {
    await handleInboundReply({
      supabase,
      reviewRequest,
      organization,
      settings,
      customer,
      messageId: message.id,
      body: message.text!,
    });
  }

  const { data: refreshed } = await supabase
    .from("review_requests")
    .select("status")
    .eq("id", reviewRequestId)
    .maybeSingle();

  return { done: refreshed ? ["responded", "review_prompt_sent"].includes(refreshed.status) : true };
}

// Mirrors the inbound-reply handling in apps/web/src/lib/webhooks.ts
// (processTwilioWebhook) for the Beeper polling path -- this package can't
// import from apps/web, so the classify-answer-or-send-the-link logic is
// duplicated here.
async function handleInboundReply({
  supabase,
  reviewRequest,
  organization,
  settings,
  customer,
  messageId,
  body,
}: {
  supabase: any;
  reviewRequest: any;
  organization: any;
  settings: any;
  customer: any;
  messageId: string;
  body: string;
}) {
  await insertMessageEvent(supabase, {
    organization_id: reviewRequest.organization_id,
    review_request_id: reviewRequest.id,
    payment_event_id: reviewRequest.payment_event_id,
    customer_id: customer.id,
    provider: "beeper",
    provider_message_sid: messageId,
    direction: "inbound",
    message_type: "sms_inbound_received",
    status: "received",
    message_body: body,
    occurred_at: new Date().toISOString(),
  });

  const parsed = await analyzeReplyMessage(body);

  await supabase.from("feedback_responses").insert({
    organization_id: reviewRequest.organization_id,
    review_request_id: reviewRequest.id,
    customer_id: customer.id,
    payment_event_id: reviewRequest.payment_event_id,
    score: parsed.score,
    free_text: parsed.freeText,
    sentiment_bucket: parsed.bucket,
    owner_follow_up_required: parsed.bucket === "negative" || parsed.isQuestion,
    review_prompt_sent: parsed.bucket === "positive",
    review_prompt_sent_at: parsed.bucket === "positive" ? new Date().toISOString() : null,
  });

  const trackedReviewUrl =
    parsed.bucket === "positive" ? `${appUrl}/r/${reviewRequest.tracking_token}` : null;

  const followUpBody = await generateFollowUpMessage({
    isFeedback: parsed.isFeedback,
    sentiment: parsed.bucket === "unknown" ? null : parsed.bucket,
    isQuestion: parsed.isQuestion,
    trackedReviewUrl,
    customerReply: body,
    organizationName: organization.name,
  });

  const followUp = await sendBeeperMessage(customer.phone, followUpBody);

  await insertMessageEvent(supabase, {
    organization_id: reviewRequest.organization_id,
    review_request_id: reviewRequest.id,
    payment_event_id: reviewRequest.payment_event_id,
    customer_id: customer.id,
    provider: "beeper",
    provider_message_sid: followUp.sid,
    direction: "outbound",
    message_type:
      parsed.bucket === "positive"
        ? "review_prompt_sent"
        : parsed.bucket === "negative"
          ? "owner_follow_up_flagged"
          : parsed.isQuestion
            ? "question_answered"
            : "feedback_unknown",
    status: followUp.status,
    message_body: followUpBody,
    occurred_at: new Date().toISOString(),
  });

  await supabase
    .from("review_requests")
    .update({
      replied_at: new Date().toISOString(),
      status: parsed.isFeedback ? "responded" : "awaiting_follow_up",
      ...(parsed.bucket === "positive"
        ? {
            review_destination_url:
              reviewRequest.review_destination_url || settings.review_destination_url || settings.google_review_url,
            reminder_scheduled_for: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            status: "review_prompt_sent",
          }
        : {}),
    })
    .eq("id", reviewRequest.id);

  if (parsed.bucket === "positive") {
    await scheduleReviewReminder(reviewRequest.id);
  }
}

export async function sendReviewReminderIfNeeded(reviewRequestId: string) {
  const { supabase, reviewRequest, organization, settings, customer, feedback } = await getRequestBundle(reviewRequestId);

  const canSendViaTwilio = Boolean(settings?.twilio_account_sid && settings?.twilio_phone_number);

  if (!settings?.auto_send_enabled || !customer?.phone || (!canSendViaTwilio && !hasBeeperEnv())) {
    return;
  }

  if (reviewRequest.review_prompt_clicked_at || reviewRequest.reminder_sent_at) {
    return;
  }

  if (!feedback?.review_prompt_sent) {
    return;
  }

  const destination = reviewRequest.review_destination_url;
  if (!destination) {
    return;
  }

  const provider = canSendViaTwilio ? "twilio" : "beeper";
  const trackedLink = `${appUrl}/r/${reviewRequest.tracking_token}`;
  const body = await generateReminderMessage({
    trackedReviewUrl: trackedLink,
    organizationName: organization.name,
  });
  const message =
    provider === "twilio"
      ? await getTwilioClient(settings.twilio_account_sid).messages.create({
          body,
          from: settings.twilio_phone_number,
          to: customer.phone,
          statusCallback: `${appUrl}/api/webhooks/twilio?reviewRequestId=${reviewRequest.id}`,
        })
      : await sendBeeperMessage(customer.phone, body);

  await supabase
    .from("review_requests")
    .update({
      reminder_sent_at: new Date().toISOString(),
      status: "review_reminder_sent",
    })
    .eq("id", reviewRequest.id);

  await insertMessageEvent(supabase, {
    organization_id: reviewRequest.organization_id,
    review_request_id: reviewRequest.id,
    payment_event_id: reviewRequest.payment_event_id,
    customer_id: reviewRequest.customer_id,
    provider,
    provider_message_sid: message.sid,
    direction: "outbound",
    message_type: "review_reminder_sent",
    status: message.status ?? "sent",
    message_body: body,
    occurred_at: new Date().toISOString(),
  });
}
