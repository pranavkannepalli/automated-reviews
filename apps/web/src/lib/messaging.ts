import twilio from "twilio";

import {
  generateFollowUpMessage,
  generateInitialAskMessage,
  type SentimentBucket,
} from "@automated-reviews/core";

import { getAppUrl } from "./env";

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
