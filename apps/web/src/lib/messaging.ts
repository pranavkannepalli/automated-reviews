import twilio from "twilio";

import {
  generateFollowUpMessage,
  generateInitialAskMessage,
  type SentimentBucket,
} from "@automated-reviews/core";

import { sendBeeperMessage } from "./beeper";
import { getAppUrl, hasBeeperEnv, hasTwilioEnv } from "./env";

type SendMessageArgs = {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
  reviewRequestId: string;
};

export async function sendTwilioMessage({
  accountSid,
  authToken,
  from,
  to,
  body,
  reviewRequestId,
}: SendMessageArgs) {
  const client = twilio(accountSid, authToken);
  return client.messages.create({
    body,
    from,
    to,
    statusCallback: `${getAppUrl()}/api/webhooks/twilio?reviewRequestId=${reviewRequestId}`,
  });
}

export type OutboundSendResult = {
  provider: "twilio" | "beeper";
  sid: string | null;
  status: string;
};

// Prefers Twilio when an org has a verified number configured; otherwise
// falls back to sending from the owner's own number via Beeper Desktop.
// Drop the Beeper fallback once Twilio numbers are verified for everyone.
export async function sendOutboundReviewMessage({
  to,
  body,
  reviewRequestId,
  twilioAccountSid,
  twilioPhoneNumber,
}: {
  to: string;
  body: string;
  reviewRequestId: string;
  twilioAccountSid: string | null;
  twilioPhoneNumber: string | null;
}): Promise<OutboundSendResult | null> {
  if (twilioAccountSid && twilioPhoneNumber && hasTwilioEnv()) {
    const message = await sendTwilioMessage({
      accountSid: twilioAccountSid,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      from: twilioPhoneNumber,
      to,
      body,
      reviewRequestId,
    });

    return { provider: "twilio", sid: message.sid, status: message.status ?? "sent" };
  }

  if (hasBeeperEnv()) {
    const message = await sendBeeperMessage({ to, body });
    return { provider: "beeper", sid: message.sid, status: message.status };
  }

  return null;
}

export async function getInitialMessageBody(organizationName: string) {
  return generateInitialAskMessage({ organizationName });
}

export async function getFollowUpMessageBody({
  bucket,
  trackedReviewUrl,
  customerReply,
  organizationName,
}: {
  bucket: SentimentBucket;
  trackedReviewUrl: string | null;
  customerReply: string;
  organizationName: string;
}) {
  return generateFollowUpMessage({
    bucket,
    trackedReviewUrl,
    customerReply,
    organizationName,
  });
}
