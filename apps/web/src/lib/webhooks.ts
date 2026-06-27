import crypto from "node:crypto";

import { analyzeReplyMessage, normalizeSquarePayment } from "@automated-reviews/core";

import { getAppUrl, hasBeeperEnv, hasTwilioEnv } from "./env";
import { createSupabaseAdminClient } from "./supabase";
import { getFollowUpMessageBody, getInitialMessageBody, sendOutboundReviewMessage } from "./messaging";
import { scheduleInitialReviewRequest, scheduleReviewReminder } from "./temporal";

function buildTrackedReviewUrl(token: string) {
  return `${getAppUrl()}/r/${token}`;
}

export async function sendInitialReviewRequestNow(reviewRequestId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createSupabaseAdminClient();
  const { data: reviewRequest, error: requestError } = await supabase
    .from("review_requests")
    .select("*")
    .eq("id", reviewRequestId)
    .maybeSingle();

  if (requestError) {
    throw requestError;
  }

  if (!reviewRequest) {
    throw new Error("Review request not found.");
  }

  const [{ data: setting }, { data: organization }, { data: customer }] = await Promise.all([
    supabase.from("organization_settings").select("*").eq("organization_id", reviewRequest.organization_id).maybeSingle(),
    supabase.from("organizations").select("*").eq("id", reviewRequest.organization_id).maybeSingle(),
    reviewRequest.customer_id
      ? supabase.from("customers").select("*").eq("id", reviewRequest.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!setting || !organization || !customer?.phone) {
    throw new Error("Review request is missing settings, organization, or customer phone.");
  }

  const initialBody = await getInitialMessageBody(organization.name);
  await supabase.from("message_events").insert({
    organization_id: reviewRequest.organization_id,
    review_request_id: reviewRequest.id,
    payment_event_id: reviewRequest.payment_event_id,
    customer_id: reviewRequest.customer_id,
    provider: hasTwilioEnv() ? "twilio" : hasBeeperEnv() ? "beeper" : "demo",
    direction: "outbound",
    message_type: "sms_send_attempted",
    status: "attempted",
    message_body: initialBody,
    occurred_at: new Date().toISOString(),
  });

  const result = await sendOutboundReviewMessage({
    to: customer.phone,
    body: initialBody,
    reviewRequestId: reviewRequest.id,
    twilioAccountSid: setting.twilio_account_sid,
    twilioPhoneNumber: setting.twilio_phone_number,
  });

  if (result) {
    await supabase
      .from("review_requests")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", reviewRequest.id);

    await supabase.from("message_events").insert({
      organization_id: reviewRequest.organization_id,
      review_request_id: reviewRequest.id,
      payment_event_id: reviewRequest.payment_event_id,
      customer_id: reviewRequest.customer_id,
      provider: result.provider,
      provider_message_sid: result.sid,
      direction: "outbound",
      message_type: "sms_sent",
      status: result.status,
      message_body: initialBody,
      occurred_at: new Date().toISOString(),
    });

    return { mode: result.provider, customerPhone: customer.phone };
  }

  await supabase
    .from("review_requests")
    .update({
      status: "sent_simulated",
      sent_at: new Date().toISOString(),
    })
    .eq("id", reviewRequest.id);

  await supabase.from("message_events").insert({
    organization_id: reviewRequest.organization_id,
    review_request_id: reviewRequest.id,
    payment_event_id: reviewRequest.payment_event_id,
    customer_id: reviewRequest.customer_id,
    provider: "demo",
    direction: "outbound",
    message_type: "sms_sent",
    status: "simulated",
    message_body: initialBody,
    occurred_at: new Date().toISOString(),
  });

  return { mode: "simulated", customerPhone: customer.phone };
}

export async function processSquareWebhook(
  payload: unknown,
  options?: {
    forceImmediateSend?: boolean;
    delayMinutesOverride?: number;
  },
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createSupabaseAdminClient();
  const normalized = normalizeSquarePayment(payload);

  if (!normalized.sourceLocationId) {
    return { ignored: true, reason: "Square payment did not include a location id." };
  }

  const { data: setting, error: settingsError } = await supabase
    .from("organization_settings")
    .select("*, organization:organizations(*)")
    .eq("square_location_id", normalized.sourceLocationId)
    .maybeSingle();

  if (settingsError) {
    throw settingsError;
  }

  if (!setting?.organization_id) {
    return { ignored: true, reason: "No organization matched the Square location." };
  }

  let customerId: string | null = null;

  if (normalized.phone) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .upsert(
        {
          organization_id: setting.organization_id,
          phone: normalized.phone,
          first_name: normalized.firstName,
          last_name: normalized.lastName,
          last_payment_at: normalized.occurredAt,
        },
        {
          onConflict: "organization_id,phone",
        },
      )
      .select("id")
      .single();

    if (customerError) {
      throw customerError;
    }

    customerId = customer.id;
  }

  const { data: paymentEvent, error: paymentError } = await supabase
    .from("payment_events")
    .upsert(
      {
        organization_id: setting.organization_id,
        customer_id: customerId,
        source: normalized.source,
        source_payment_id: normalized.sourcePaymentId,
        source_location_id: normalized.sourceLocationId,
        amount: normalized.amount,
        currency: normalized.currency,
        status: normalized.status,
        phone: normalized.phone,
        occurred_at: normalized.occurredAt,
        raw_payload: payload as never,
      },
      {
        onConflict: "organization_id,source,source_payment_id",
      },
    )
    .select("id")
    .single();

  if (paymentError) {
    throw paymentError;
  }

  await supabase.from("message_events").insert({
    organization_id: setting.organization_id,
    payment_event_id: paymentEvent.id,
    customer_id: customerId,
    provider: "system",
    direction: "internal",
    message_type: "payment_received",
    status: "recorded",
    occurred_at: normalized.occurredAt,
  });

  if (!normalized.phone) {
    return { ignored: true, reason: "Payment event did not include a usable phone number." };
  }

  const { data: reviewRequest, error: reviewRequestError } = await supabase
    .from("review_requests")
    .insert({
      organization_id: setting.organization_id,
      payment_event_id: paymentEvent.id,
      customer_id: customerId,
      review_destination_url: setting.review_destination_url || setting.google_review_url,
      channel: "sms",
      status: setting.auto_send_enabled ? "queued" : "draft",
      scheduled_for: normalized.occurredAt,
    })
    .select("id")
    .single();

  if (reviewRequestError) {
    throw reviewRequestError;
  }

  await supabase.from("message_events").insert({
    organization_id: setting.organization_id,
    review_request_id: reviewRequest.id,
    payment_event_id: paymentEvent.id,
    customer_id: customerId,
    provider: "system",
    direction: "internal",
    message_type: "review_request_created",
    status: "recorded",
    occurred_at: new Date().toISOString(),
  });

  const canSendViaTwilio = Boolean(setting.twilio_phone_number && setting.twilio_account_sid && hasTwilioEnv());

  if (!setting.auto_send_enabled || (!canSendViaTwilio && !hasBeeperEnv())) {
    return { created: true, reviewRequestId: reviewRequest.id, sent: false };
  }

  let scheduled = false;

  if (!options?.forceImmediateSend) {
    scheduled = await scheduleInitialReviewRequest({
      reviewRequestId: reviewRequest.id,
      delayMinutes: Math.max(
        Number(options?.delayMinutesOverride ?? setting.message_delay_minutes ?? 120),
        0,
      ),
    });
  }

  if (!scheduled) {
    const initialBody = await getInitialMessageBody(setting.organization.name);

    await supabase.from("message_events").insert({
      organization_id: setting.organization_id,
      review_request_id: reviewRequest.id,
      payment_event_id: paymentEvent.id,
      customer_id: customerId,
      provider: canSendViaTwilio ? "twilio" : "beeper",
      direction: "outbound",
      message_type: "sms_send_attempted",
      status: "attempted",
      message_body: initialBody,
      occurred_at: new Date().toISOString(),
    });

    const result = await sendOutboundReviewMessage({
      to: normalized.phone,
      body: initialBody,
      reviewRequestId: reviewRequest.id,
      twilioAccountSid: setting.twilio_account_sid,
      twilioPhoneNumber: setting.twilio_phone_number,
    });

    if (result) {
      await supabase
        .from("review_requests")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", reviewRequest.id);

      await supabase.from("message_events").insert({
        organization_id: setting.organization_id,
        review_request_id: reviewRequest.id,
        payment_event_id: paymentEvent.id,
        customer_id: customerId,
        provider: result.provider,
        provider_message_sid: result.sid,
        direction: "outbound",
        message_type: "sms_sent",
        status: result.status,
        message_body: initialBody,
        occurred_at: new Date().toISOString(),
      });
    }
  }

  return { created: true, reviewRequestId: reviewRequest.id, scheduled: true };
}

export async function processTwilioWebhook(values: Record<string, string>, reviewRequestId?: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createSupabaseAdminClient();
  const from = values.From ?? values.FromNumber ?? "";
  const to = values.To ?? "";
  const messageSid = values.MessageSid ?? values.SmsSid ?? null;
  const status = values.MessageStatus ?? values.SmsStatus ?? null;
  const body = values.Body ?? "";

  if (status && !body) {
    const { data: request } = await supabase
      .from("review_requests")
      .select("id, organization_id, payment_event_id, customer_id")
      .eq("id", reviewRequestId ?? "")
      .maybeSingle();

    if (!request) {
      return { ignored: true, reason: "Status callback could not find review request." };
    }

    await supabase.from("message_events").insert({
      organization_id: request.organization_id,
      review_request_id: request.id,
      payment_event_id: request.payment_event_id,
      customer_id: request.customer_id,
      provider: "twilio",
      provider_message_sid: messageSid,
      direction: "outbound",
      message_type: status === "delivered" ? "sms_delivered" : status === "failed" ? "sms_failed" : "sms_sent",
      status,
      occurred_at: new Date().toISOString(),
    });

    if (status === "delivered") {
      await supabase
        .from("review_requests")
        .update({ delivered_at: new Date().toISOString(), status: "delivered" })
        .eq("id", request.id);
    }

    return { updated: true, kind: "status" };
  }

  const { data: organizationSetting, error: orgError } = await supabase
    .from("organization_settings")
    .select("*, organization:organizations(*)")
    .eq("twilio_phone_number", to)
    .maybeSingle();

  if (orgError) {
    throw orgError;
  }

  if (!organizationSetting) {
    return { ignored: true, reason: "Inbound message phone number does not match an organization." };
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id, first_name, last_name")
    .eq("organization_id", organizationSetting.organization_id)
    .eq("phone", from)
    .maybeSingle();

  const { data: reviewRequest } = await supabase
    .from("review_requests")
    .select("id, payment_event_id, tracking_token, review_destination_url")
    .eq("organization_id", organizationSetting.organization_id)
    .eq("customer_id", customer?.id ?? "")
    .in("status", ["queued", "sent", "delivered", "awaiting_follow_up"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!reviewRequest || !customer) {
    return { ignored: true, reason: "Inbound message did not match an open review request." };
  }

  const parsed = await analyzeReplyMessage(body);

  await supabase.from("message_events").insert({
    organization_id: organizationSetting.organization_id,
    review_request_id: reviewRequest.id,
    payment_event_id: reviewRequest.payment_event_id,
    customer_id: customer.id,
    provider: "twilio",
    provider_message_sid: messageSid,
    direction: "inbound",
    message_type: "sms_inbound_received",
    status: "received",
    message_body: body,
    occurred_at: new Date().toISOString(),
  });

  const { data: feedback, error: feedbackError } = await supabase
    .from("feedback_responses")
    .insert({
      organization_id: organizationSetting.organization_id,
      review_request_id: reviewRequest.id,
      customer_id: customer.id,
      payment_event_id: reviewRequest.payment_event_id,
      score: parsed.score,
      free_text: parsed.freeText,
      sentiment_bucket: parsed.bucket,
      owner_follow_up_required: parsed.bucket === "negative" || parsed.isQuestion,
      review_prompt_sent: false,
    })
    .select("id")
    .single();

  if (feedbackError) {
    throw feedbackError;
  }

  await supabase
    .from("review_requests")
    .update({
      replied_at: new Date().toISOString(),
      status: parsed.isFeedback ? "responded" : "awaiting_follow_up",
    })
    .eq("id", reviewRequest.id);

  const trackedReviewUrl =
    parsed.bucket === "positive" && reviewRequest.tracking_token
      ? buildTrackedReviewUrl(reviewRequest.tracking_token)
      : null;
  const followUpBody = await getFollowUpMessageBody({
    isFeedback: parsed.isFeedback,
    sentiment: parsed.bucket === "unknown" ? null : parsed.bucket,
    isQuestion: parsed.isQuestion,
    trackedReviewUrl,
    customerReply: body,
    organizationName: organizationSetting.organization.name,
  });

  const followUp = await sendOutboundReviewMessage({
    to: from,
    body: followUpBody,
    reviewRequestId: reviewRequest.id,
    twilioAccountSid: organizationSetting.twilio_account_sid,
    twilioPhoneNumber: organizationSetting.twilio_phone_number,
  });

  if (followUp) {
    await supabase.from("message_events").insert({
      organization_id: organizationSetting.organization_id,
      review_request_id: reviewRequest.id,
      payment_event_id: reviewRequest.payment_event_id,
      customer_id: customer.id,
      provider: followUp.provider,
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
  }

  if (parsed.bucket === "positive") {
    await supabase
      .from("feedback_responses")
      .update({
        review_prompt_sent: true,
        review_prompt_sent_at: new Date().toISOString(),
      })
      .eq("id", feedback.id);

    await supabase
      .from("review_requests")
      .update({
        review_destination_url:
          reviewRequest.review_destination_url ||
          organizationSetting.review_destination_url ||
          organizationSetting.google_review_url,
        reminder_scheduled_for: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        status: "review_prompt_sent",
      })
      .eq("id", reviewRequest.id);

    await scheduleReviewReminder({
      reviewRequestId: reviewRequest.id,
      delayHours: 48,
    });
  }

  return {
    created: true,
    bucket: parsed.bucket,
  };
}

export function verifySquareSignature({
  body,
  signatureHeader,
  signatureKey,
  notificationUrl,
}: {
  body: string;
  signatureHeader: string | null;
  signatureKey: string | null;
  notificationUrl: string;
}) {
  if (!signatureHeader || !signatureKey) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", signatureKey)
    .update(notificationUrl + body)
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
}
