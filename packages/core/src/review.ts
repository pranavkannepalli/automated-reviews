export type SentimentBucket = "negative" | "positive" | "unknown";

export type ParsedFeedbackReply = {
  score: number | null;
  freeText: string | null;
  bucket: SentimentBucket;
  isFeedback: boolean;
  isQuestion: boolean;
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
const POSITIVE_WORDS = [
  "great",
  "good",
  "love",
  "loved",
  "awesome",
  "amazing",
  "excellent",
  "fantastic",
  "happy",
  "wonderful",
  "perfect",
];
const NEGATIVE_WORDS = [
  "bad",
  "terrible",
  "awful",
  "hate",
  "hated",
  "poor",
  "disappointed",
  "disappointing",
  "slow",
  "rude",
  "cold",
  "worst",
];

export function getSentimentBucket(score: number): SentimentBucket {
  return score >= 4 ? "positive" : "negative";
}

// No GEMINI_API_KEY configured fallback. Deliberately keyword-based rather
// than requiring a 1-5 reply -- analyzeReplyMessage (llm.ts) is the smart
// path and only falls back to this when Gemini isn't available.
export function parseFeedbackReply(input: string): ParsedFeedbackReply {
  const trimmed = input.trim().replace(/\s+/g, " ");
  const lower = trimmed.toLowerCase();
  const isQuestion = trimmed.endsWith("?");

  const scoreMatch = trimmed.match(SCORE_REGEX);
  const score = scoreMatch ? Number(scoreMatch[1]) : null;
  const freeText = (scoreMatch ? trimmed.replace(scoreMatch[0], " ") : trimmed).trim().replace(/\s+/g, " ") || null;

  const hasPositiveWord = POSITIVE_WORDS.some((word) => lower.includes(word));
  const hasNegativeWord = NEGATIVE_WORDS.some((word) => lower.includes(word));

  let sentiment: "positive" | "negative" | null = null;
  if (score !== null) {
    sentiment = score >= 4 ? "positive" : "negative";
  } else if (hasNegativeWord && !hasPositiveWord) {
    sentiment = "negative";
  } else if (hasPositiveWord && !hasNegativeWord) {
    sentiment = "positive";
  }

  const isFeedback = sentiment !== null;
  const bucket: SentimentBucket = sentiment ?? "unknown";

  return {
    score,
    freeText,
    bucket,
    isFeedback,
    isQuestion,
    reviewPromptEligible: bucket === "positive",
  };
}

export function buildInitialAskCopy(organizationName: string) {
  return `Thanks for visiting ${organizationName}! How did everything go?`;
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

export function buildQuestionFallbackCopy() {
  return "Thanks for asking -- someone from our team will get back to you shortly.";
}

export function buildNeutralAckCopy() {
  return "Thanks for letting us know!";
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
