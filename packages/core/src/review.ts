export type SentimentBucket = "negative" | "positive" | "unknown";

export type ParsedFeedbackReply = {
  score: number | null;
  freeText: string | null;
  bucket: SentimentBucket;
  reviewPromptEligible: boolean;
};

export type NormalizedSquarePayment = {
  source: "square";
  sourcePaymentId: string;
  sourceLocationId: string | null;
  amount: number;
  currency: string;
  status: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  occurredAt: string;
};

const SCORE_REGEX = /(?:^|\s)([1-5])(?:\s|$)/;

export function getSentimentBucket(score: number): SentimentBucket {
  return score >= 4 ? "positive" : "negative";
}

export function parseFeedbackReply(input: string): ParsedFeedbackReply {
  const trimmed = input.trim().replace(/\s+/g, " ");
  const match = trimmed.match(SCORE_REGEX);

  if (!match) {
    return {
      score: null,
      freeText: trimmed || null,
      bucket: "unknown",
      reviewPromptEligible: false,
    };
  }

  const score = Number(match[1]);
  const freeText = trimmed.replace(match[0], " ").trim() || null;
  const bucket = getSentimentBucket(score);

  return {
    score,
    freeText,
    bucket,
    reviewPromptEligible: bucket === "positive",
  };
}

export function buildInitialAskCopy(organizationName: string) {
  return `Thanks for visiting ${organizationName}. How was your experience today? Reply 1-5.`;
}

export function buildPositiveFollowUpCopy(googleReviewUrl: string) {
  return `Glad to hear it. Would you mind leaving a quick review? ${googleReviewUrl}`;
}

export function buildReminderFollowUpCopy(googleReviewUrl: string) {
  return `Just a quick reminder in case you missed it. We'd love your review: ${googleReviewUrl}`;
}

export function buildNegativeFollowUpCopy() {
  return "Thanks for the feedback. We appreciate it and will review it internally.";
}

export function buildUnknownReplyCopy() {
  return "Thanks. Could you reply with a number from 1 to 5?";
}

export function normalizeSquarePayment(payload: any): NormalizedSquarePayment {
  const payment = payload?.data?.object?.payment ?? payload?.data?.object?.payment_created ?? {};
  const customer = payment?.customer_details ?? {};

  return {
    source: "square",
    sourcePaymentId: payment?.id ?? payload?.entity_id ?? payload?.event_id,
    sourceLocationId: payment?.location_id ?? null,
    amount: Number(payment?.amount_money?.amount ?? 0),
    currency: payment?.amount_money?.currency ?? "USD",
    status: String(payment?.status ?? "unknown").toLowerCase(),
    phone: customer?.phone_number ?? payment?.billing_address?.phone ?? null,
    firstName: customer?.given_name ?? null,
    lastName: customer?.family_name ?? null,
    occurredAt: payload?.created_at ?? new Date().toISOString(),
  };
}
