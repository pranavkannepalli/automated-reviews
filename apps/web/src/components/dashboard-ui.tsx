import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Star,
} from "lucide-react";

import type { ActivityItem, DashboardSummary, DailyMetricPoint } from "@/lib/dashboard";
import { cn, formatMetric, formatMinutes, formatPercent, relativeTime } from "@/lib/utils";

function MetricCard({
  label,
  value,
  note,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-[28px] border border-white/8 bg-slate-950/80 p-5 shadow-[0_24px_80px_rgba(5,10,22,0.45)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">{label}</p>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl",
            tone === "positive" && "bg-emerald-400/15 text-emerald-300",
            tone === "negative" && "bg-rose-400/15 text-rose-300",
            tone === "neutral" && "bg-sky-400/15 text-sky-300",
          )}
        >
          {icon}
        </div>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{note}</p>
    </div>
  );
}

function BarRow({
  label,
  current,
  max,
  tone = "sky",
}: {
  label: string;
  current: number;
  max: number;
  tone?: "sky" | "emerald" | "rose" | "amber";
}) {
  const width = max > 0 ? Math.max((current / max) * 100, current > 0 ? 8 : 0) : 0;
  const toneClasses = {
    sky: "from-sky-400 to-cyan-300",
    emerald: "from-emerald-400 to-teal-300",
    rose: "from-rose-400 to-orange-300",
    amber: "from-amber-300 to-yellow-200",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>{label}</span>
        <span>{formatMetric(current)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/6">
        <div
          className={cn("h-2 rounded-full bg-gradient-to-r", toneClasses[tone])}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-white/8 bg-slate-950/80 p-6 shadow-[0_24px_80px_rgba(5,10,22,0.45)]">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ActivityFeed({ items, emptyCopy }: { items: ActivityItem[]; emptyCopy: string }) {
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-6 text-sm text-slate-400">
        {emptyCopy}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-4 rounded-3xl border border-white/6 bg-white/3 px-4 py-4"
        >
          <div>
            <p className="text-sm font-medium text-white">
              {item.customer_name ?? item.customer_phone ?? "Unknown customer"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {item.message_body ?? item.event_type.replaceAll("_", " ")}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>{item.status ?? item.sentiment_bucket ?? item.event_type}</p>
            <p className="mt-1">{relativeTime(item.occurred_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyChart({ points }: { points: DailyMetricPoint[] }) {
  const max = Math.max(...points.map((point) => point.sent), 1);

  if (!points.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-6 text-sm text-slate-400">
        No events yet. As Square and Twilio webhooks land, the 5-day chart will populate automatically.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
      <div className="grid grid-cols-5 gap-3">
        {points.map((point) => {
          const height = Math.max((point.sent / max) * 180, point.sent > 0 ? 24 : 12);
          return (
            <div key={point.date} className="flex flex-col justify-end gap-3">
              <div className="rounded-[24px] border border-white/8 bg-white/3 px-3 py-3">
                <div
                  className="w-full rounded-full bg-gradient-to-t from-sky-500 via-cyan-300 to-emerald-300"
                  style={{ height }}
                />
              </div>
              <div className="text-center text-xs text-slate-500">
                {new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-4 rounded-[28px] border border-white/6 bg-white/3 p-5">
        <BarRow label="Payments" current={points.reduce((sum, point) => sum + point.payments, 0)} max={max * 2} />
        <BarRow label="Replies" current={points.reduce((sum, point) => sum + point.replies, 0)} max={max * 2} tone="emerald" />
        <BarRow label="Positive" current={points.reduce((sum, point) => sum + point.positive, 0)} max={max * 2} tone="amber" />
        <BarRow
          label="Review prompts"
          current={points.reduce((sum, point) => sum + point.reviewPrompts, 0)}
          max={max * 2}
          tone="rose"
        />
      </div>
    </div>
  );
}

export function DashboardView({
  organizationName,
  summary,
  settingsSummary,
}: {
  organizationName: string;
  summary: DashboardSummary;
  settingsSummary: {
    googleReviewUrl: string | null;
    twilioPhoneNumber: string | null;
    squareLocationId: string | null;
    autoSendEnabled: boolean;
  };
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          label="Total payment events"
          value={formatMetric(summary.totals.paymentEvents)}
          note="All Square payments logged in the last 5 days."
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <MetricCard
          label="Reply rate"
          value={formatPercent(summary.totals.replyRate)}
          note={`${formatMetric(summary.totals.repliesReceived)} replies from delivered SMS`}
          icon={<MessageSquareText className="h-5 w-5" />}
        />
        <MetricCard
          label="Positive rate"
          value={formatPercent(summary.totals.positiveRate)}
          note={`${formatMetric(summary.totals.positiveReplies)} happy customers routed toward reviews`}
          icon={<Star className="h-5 w-5" />}
          tone="positive"
        />
        <MetricCard
          label="Review prompts sent"
          value={formatMetric(summary.totals.reviewPromptsSent)}
          note={`${formatPercent(summary.totals.reviewPromptRate)} of replies converted into review asks`}
          icon={<Sparkles className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Messaging volume" description="Last 5 days of payment-triggered review outreach.">
          <DailyChart points={summary.daily} />
        </SectionCard>

        <SectionCard title="Funnel snapshot" description={`${organizationName} from payment to public review ask.`}>
          <div className="space-y-4">
            <BarRow label="Payments" current={summary.totals.paymentEvents} max={summary.totals.paymentEvents || 1} />
            <BarRow
              label="Eligible customers"
              current={summary.totals.eligibleCustomers}
              max={summary.totals.paymentEvents || 1}
              tone="emerald"
            />
            <BarRow label="Messages sent" current={summary.totals.messagesSent} max={summary.totals.paymentEvents || 1} tone="sky" />
            <BarRow
              label="Replies"
              current={summary.totals.repliesReceived}
              max={summary.totals.paymentEvents || 1}
              tone="amber"
            />
            <BarRow
              label="Positive"
              current={summary.totals.positiveReplies}
              max={summary.totals.paymentEvents || 1}
              tone="emerald"
            />
            <BarRow
              label="Review prompts"
              current={summary.totals.reviewPromptsSent}
              max={summary.totals.paymentEvents || 1}
              tone="rose"
            />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div className="rounded-3xl border border-white/6 bg-white/3 p-4">
              <p className="text-slate-500">Avg response time</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatMinutes(summary.totals.avgResponseTimeMinutes)}</p>
            </div>
            <div className="rounded-3xl border border-white/6 bg-white/3 p-4">
              <p className="text-slate-500">Recovery needed</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatMetric(summary.totals.recoveryNeeded)}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Recent activity" description="Chronological customer and delivery signals.">
          <ActivityFeed
            items={summary.recentActivity}
            emptyCopy="No activity yet. Trigger the Square webhook or seed test data to populate the feed."
          />
        </SectionCard>

        <SectionCard title="Negative feedback queue" description="Customers who need owner follow-up before public damage.">
          <ActivityFeed
            items={summary.negativeFeedback}
            emptyCopy="No negative or neutral feedback has been captured in the last 5 days."
          />
        </SectionCard>

        <SectionCard title="Positive customers" description="Customers who are candidates for public review prompts.">
          <ActivityFeed
            items={summary.positiveCustomers}
            emptyCopy="No positive replies yet. Once a customer texts back 4 or 5, they’ll appear here."
          />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <SectionCard title="Delivery failure reasons" description="Top Twilio issues across the active organization.">
          {summary.topFailureReasons.length ? (
            <div className="space-y-3">
              {summary.topFailureReasons.map((failure) => (
                <div key={failure.reason} className="flex items-center justify-between rounded-3xl border border-white/6 bg-white/3 px-4 py-4">
                  <div className="flex items-center gap-3 text-sm text-white">
                    <ShieldAlert className="h-4 w-4 text-rose-300" />
                    {failure.reason}
                  </div>
                  <div className="text-sm text-slate-400">{formatMetric(failure.count)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-6 text-sm text-slate-400">
              No delivery failures in the current 5-day window.
            </div>
          )}
        </SectionCard>

        <SectionCard title="Settings summary" description="The configuration the current automation flow is using right now.">
          <div className="grid gap-3 text-sm text-slate-300">
            <SummaryRow label="Google review link" value={settingsSummary.googleReviewUrl ?? "Not set"} />
            <SummaryRow label="Twilio number" value={settingsSummary.twilioPhoneNumber ?? "Not set"} />
            <SummaryRow label="Square location" value={settingsSummary.squareLocationId ?? "Not set"} />
            <SummaryRow
              label="Auto-send"
              value={settingsSummary.autoSendEnabled ? "Enabled" : "Disabled"}
              tone={settingsSummary.autoSendEnabled ? "positive" : "negative"}
            />
            <SummaryRow label="Delivery trend" value={`${formatMetric(summary.totals.messagesDelivered)} delivered`} tone="positive" />
            <SummaryRow label="Failure trend" value={`${formatMetric(summary.totals.messageFailures)} failed`} tone="negative" />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-white/6 bg-white/3 px-4 py-4">
      <div>
        <p className="text-slate-500">{label}</p>
        <p className="mt-1 font-medium text-white">{value}</p>
      </div>
      {tone === "positive" ? (
        <ArrowUpRight className="h-4 w-4 text-emerald-300" />
      ) : tone === "negative" ? (
        <ArrowDownRight className="h-4 w-4 text-rose-300" />
      ) : (
        <Clock3 className="h-4 w-4 text-slate-500" />
      )}
    </div>
  );
}
