import { hasSupabaseEnv } from "./env";
import { createSupabaseServerClient } from "./supabase";

export type DailyMetricPoint = {
  date: string;
  payments: number;
  eligibleCustomers: number;
  sent: number;
  delivered: number;
  replies: number;
  positive: number;
  reviewPrompts: number;
  failures: number;
};

export type ActivityItem = {
  id: string;
  occurred_at: string;
  event_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  message_body: string | null;
  status: string | null;
  score: number | null;
  sentiment_bucket: string | null;
};

export type FailureReason = {
  reason: string;
  count: number;
};

export type DashboardSummary = {
  mode: "configured" | "setup-required";
  totals: {
    paymentEvents: number;
    eligibleCustomers: number;
    messagesQueued: number;
    messagesSent: number;
    messagesDelivered: number;
    messageFailures: number;
    repliesReceived: number;
    replyRate: number;
    positiveReplies: number;
    positiveRate: number;
    negativeReplies: number;
    recoveryNeeded: number;
    reviewPromptsSent: number;
    reviewPromptRate: number;
    avgResponseTimeMinutes: number;
  };
  daily: DailyMetricPoint[];
  recentActivity: ActivityItem[];
  negativeFeedback: ActivityItem[];
  positiveCustomers: ActivityItem[];
  topFailureReasons: FailureReason[];
};

const EMPTY_SUMMARY: DashboardSummary = {
  mode: "configured",
  totals: {
    paymentEvents: 0,
    eligibleCustomers: 0,
    messagesQueued: 0,
    messagesSent: 0,
    messagesDelivered: 0,
    messageFailures: 0,
    repliesReceived: 0,
    replyRate: 0,
    positiveReplies: 0,
    positiveRate: 0,
    negativeReplies: 0,
    recoveryNeeded: 0,
    reviewPromptsSent: 0,
    reviewPromptRate: 0,
    avgResponseTimeMinutes: 0,
  },
  daily: [],
  recentActivity: [],
  negativeFeedback: [],
  positiveCustomers: [],
  topFailureReasons: [],
};

export async function getDashboardSummary(organizationId: string, days = 5): Promise<DashboardSummary> {
  if (!hasSupabaseEnv()) {
    return {
      ...EMPTY_SUMMARY,
      mode: "setup-required",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("dashboard_summary", {
    p_org_id: organizationId,
    p_days: days,
  });

  if (error) {
    throw error;
  }

  return {
    ...EMPTY_SUMMARY,
    ...(data as DashboardSummary),
    mode: "configured",
  };
}

export async function getActivityFeed(organizationId: string, days = 5) {
  if (!hasSupabaseEnv()) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("dashboard_activity", {
    p_org_id: organizationId,
    p_days: days,
  });

  if (error) {
    throw error;
  }

  return (data as ActivityItem[]) ?? [];
}

export async function getFeedbackFeed(organizationId: string, days = 5) {
  if (!hasSupabaseEnv()) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("dashboard_feedback", {
    p_org_id: organizationId,
    p_days: days,
  });

  if (error) {
    throw error;
  }

  return (data as ActivityItem[]) ?? [];
}
