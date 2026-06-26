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

  if (!settings?.auto_send_enabled || !settings?.twilio_account_sid || !settings?.twilio_phone_number || !customer?.phone) {
    return;
  }

  const body = await generateInitialAskMessage({ organizationName: organization.name });

  await insertMessageEvent(supabase, {
    organization_id: reviewRequest.organization_id,
    review_request_id: reviewRequest.id,
    payment_event_id: reviewRequest.payment_event_id,
    customer_id: reviewRequest.customer_id,
    provider: "twilio",
    direction: "outbound",
    message_type: "sms_send_attempted",
    status: "attempted",
    message_body: body,
    occurred_at: new Date().toISOString(),
  });

  const client = getTwilioClient(settings.twilio_account_sid);
  const message = await client.messages.create({
    body,
    from: settings.twilio_phone_number,
    to: customer.phone,
    statusCallback: `${appUrl}/api/webhooks/twilio?reviewRequestId=${reviewRequest.id}`,
  });

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
    provider: "twilio",
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

  if (!settings?.auto_send_enabled || !settings?.twilio_account_sid || !settings?.twilio_phone_number || !customer?.phone) {
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

  const trackedLink = `${appUrl}/r/${reviewRequest.tracking_token}`;
  const body = await generateReminderMessage({
    trackedReviewUrl: trackedLink,
    organizationName: organization.name,
  });
  const client = getTwilioClient(settings.twilio_account_sid);
  const message = await client.messages.create({
    body,
    from: settings.twilio_phone_number,
    to: customer.phone,
    statusCallback: `${appUrl}/api/webhooks/twilio?reviewRequestId=${reviewRequest.id}`,
  });

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
    provider: "twilio",
    provider_message_sid: message.sid,
    direction: "outbound",
    message_type: "review_reminder_sent",
    status: message.status ?? "sent",
    message_body: body,
    occurred_at: new Date().toISOString(),
  });
}
