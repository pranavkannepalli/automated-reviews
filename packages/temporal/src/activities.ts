import {
  generateInitialAskMessage,
  generateReminderMessage,
} from "@automated-reviews/core";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

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

// Sends from the owner's own bridged number via Beeper Desktop, as a
// stand-in until Twilio numbers are verified for an organization.
async function sendBeeperMessage(to: string, body: string) {
  if (!beeperAccessToken) {
    throw new Error("BEEPER_ACCESS_TOKEN is required to send via Beeper.");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${beeperAccessToken}`,
  };

  const chatResponse = await fetch(`${beeperApiUrl}/v1/chats`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      mode: "start",
      phoneNumber: to,
      ...(beeperAccountId ? { accountID: beeperAccountId } : {}),
    }),
  });

  if (!chatResponse.ok) {
    throw new Error(`Beeper chat lookup failed with ${chatResponse.status}`);
  }

  const chat = await chatResponse.json();

  const messageResponse = await fetch(`${beeperApiUrl}/v1/chats/${chat.chatID}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text: body }),
  });

  if (!messageResponse.ok) {
    throw new Error(`Beeper send failed with ${messageResponse.status}`);
  }

  const message = await messageResponse.json();
  return { sid: (message.messageID as string | undefined) ?? null, status: "sent" };
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

export async function sendInitialReviewRequest(reviewRequestId: string) {
  const { supabase, reviewRequest, organization, settings, customer } = await getRequestBundle(reviewRequestId);

  const canSendViaTwilio = Boolean(settings?.twilio_account_sid && settings?.twilio_phone_number);

  if (!settings?.auto_send_enabled || !customer?.phone || (!canSendViaTwilio && !hasBeeperEnv())) {
    return;
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
