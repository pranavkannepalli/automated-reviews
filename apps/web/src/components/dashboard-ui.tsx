import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
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
  tone?: "neutral" | "positive" | "warning";
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            tone === "positive" && "bg-emerald-50 text-emerald-600",
            tone === "warning" && "bg-amber-50 text-amber-600",
            tone === "neutral" && "bg-sky-50 text-sky-600",
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SetupCard({
  settingsSummary,
  totals,
}: {
  settingsSummary: {
    googleReviewUrl: string | null;
    twilioPhoneNumber: string | null;
    squareLocationId: string | null;
    autoSendEnabled: boolean;
  };
  totals: DashboardSummary["totals"];
}) {
  const checklist = [
    {
      label: "Review destination is ready",
      detail: settingsSummary.googleReviewUrl ? "Customers can be routed to a live review page." : "Add your Google or destination review URL in Settings.",
      complete: Boolean(settingsSummary.googleReviewUrl),
    },
    {
      label: "Twilio sender is connected",
      detail: settingsSummary.twilioPhoneNumber ? `Using ${settingsSummary.twilioPhoneNumber}.` : "Add the Twilio number that should send review messages.",
      complete: Boolean(settingsSummary.twilioPhoneNumber),
    },
    {
      label: "Square location is mapped",
      detail: settingsSummary.squareLocationId ? `Listening for ${settingsSummary.squareLocationId}.` : "Add the Square location ID that should trigger outreach.",
      complete: Boolean(settingsSummary.squareLocationId),
    },
    {
      label: "Automatic sends are turned on",
      detail: settingsSummary.autoSendEnabled ? "New eligible customers can be contacted automatically." : "Enable auto-send when you are ready to go live.",
      complete: settingsSummary.autoSendEnabled,
    },
  ];

  const completed = checklist.filter((item) => item.complete).length;
  const readiness = Math.round((completed / checklist.length) * 100);

  return (
    <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfd_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Launch readiness</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{readiness}% ready for live traffic</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            This view is designed for owners and operators. It shows whether the automation is connected, what has been sent, and where attention is needed next.
          </p>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          {completed}/{checklist.length} complete
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4">
              <div className={cn("mt-0.5", item.complete ? "text-emerald-600" : "text-slate-300")}>
                {item.complete ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-950">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">This week at a glance</p>
          <div className="mt-5 space-y-4">
            <StatusLine label="Customers contacted" value={formatMetric(totals.messagesSent)} />
            <StatusLine label="Replies received" value={formatMetric(totals.repliesReceived)} />
            <StatusLine label="Review invitations sent" value={formatMetric(totals.reviewPromptsSent)} />
            <StatusLine label="Needs attention" value={formatMetric(totals.recoveryNeeded)} tone="warning" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusLine({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={cn("text-sm font-semibold", tone === "warning" ? "text-amber-300" : "text-white")}>{value}</span>
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
  tone?: "sky" | "emerald" | "amber" | "slate";
}) {
  const width = max > 0 ? Math.max((current / max) * 100, current > 0 ? 10 : 0) : 0;
  const toneClasses = {
    sky: "from-sky-500 to-cyan-400",
    emerald: "from-emerald-500 to-teal-400",
    amber: "from-amber-500 to-yellow-400",
    slate: "from-slate-600 to-slate-400",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-950">{formatMetric(current)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={cn("h-2 rounded-full bg-gradient-to-r", toneClasses[tone])} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ActivityFeed({ items, emptyCopy }: { items: ActivityItem[]; emptyCopy: string }) {
  if (!items.length) {
    return <EmptyState copy={emptyCopy} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-950">
                {item.customer_name ?? item.customer_phone ?? "Customer record"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {item.message_body ?? item.event_type.replaceAll("_", " ")}
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p className="font-medium capitalize text-slate-600">{item.status ?? item.sentiment_bucket ?? item.event_type}</p>
              <p className="mt-1">{relativeTime(item.occurred_at)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
      {copy}
    </div>
  );
}

function DailyChart({ points }: { points: DailyMetricPoint[] }) {
  const max = Math.max(...points.map((point) => point.sent), 1);

  if (!points.length) {
    return <EmptyState copy="Once payments and replies start landing, this five-day view will show message volume and response momentum automatically." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_0.95fr]">
      <div className="grid grid-cols-5 gap-3">
        {points.map((point) => {
          const height = Math.max((point.sent / max) * 180, point.sent > 0 ? 22 : 10);
          return (
            <div key={point.date} className="flex flex-col justify-end gap-3">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="w-full rounded-full bg-gradient-to-t from-sky-500 via-cyan-400 to-emerald-400" style={{ height }} />
              </div>
              <div className="text-center text-xs text-slate-400">
                {new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <BarRow label="Payments received" current={points.reduce((sum, point) => sum + point.payments, 0)} max={max * 2} tone="slate" />
        <BarRow label="Messages sent" current={points.reduce((sum, point) => sum + point.sent, 0)} max={max * 2} />
        <BarRow label="Replies" current={points.reduce((sum, point) => sum + point.replies, 0)} max={max * 2} tone="emerald" />
        <BarRow label="Review invitations" current={points.reduce((sum, point) => sum + point.reviewPrompts, 0)} max={max * 2} tone="amber" />
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
    <div className="flex items-center justify-between rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-950">{value}</p>
      </div>
      {tone === "positive" ? (
        <BadgeCheck className="h-4 w-4 text-emerald-600" />
      ) : tone === "negative" ? (
        <AlertCircle className="h-4 w-4 text-amber-600" />
      ) : (
        <ArrowRight className="h-4 w-4 text-slate-400" />
      )}
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
      <SetupCard settingsSummary={settingsSummary} totals={summary.totals} />

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          label="Payments captured"
          value={formatMetric(summary.totals.paymentEvents)}
          note="Square payments logged in the current reporting window."
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <MetricCard
          label="Response rate"
          value={formatPercent(summary.totals.replyRate)}
          note={`${formatMetric(summary.totals.repliesReceived)} customers replied to an outreach text.`}
          icon={<MessageSquareText className="h-5 w-5" />}
        />
        <MetricCard
          label="Positive experience rate"
          value={formatPercent(summary.totals.positiveRate)}
          note={`${formatMetric(summary.totals.positiveReplies)} customers were happy enough to consider a review.`}
          icon={<Star className="h-5 w-5" />}
          tone="positive"
        />
        <MetricCard
          label="Review invitations"
          value={formatMetric(summary.totals.reviewPromptsSent)}
          note={`${formatPercent(summary.totals.reviewPromptRate)} of replies were converted into a review ask.`}
          icon={<Sparkles className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <SectionCard title="Outreach trend" description="How customer messages are moving over the last five days.">
          <DailyChart points={summary.daily} />
        </SectionCard>

        <SectionCard title="Pipeline summary" description={`${organizationName} from payment to review-ready customer.`}>
          <div className="space-y-4">
            <BarRow label="Payments" current={summary.totals.paymentEvents} max={summary.totals.paymentEvents || 1} tone="slate" />
            <BarRow label="Eligible customers" current={summary.totals.eligibleCustomers} max={summary.totals.paymentEvents || 1} tone="emerald" />
            <BarRow label="Messages sent" current={summary.totals.messagesSent} max={summary.totals.paymentEvents || 1} />
            <BarRow label="Replies" current={summary.totals.repliesReceived} max={summary.totals.paymentEvents || 1} tone="amber" />
            <BarRow label="Positive replies" current={summary.totals.positiveReplies} max={summary.totals.paymentEvents || 1} tone="emerald" />
            <BarRow label="Review invitations" current={summary.totals.reviewPromptsSent} max={summary.totals.paymentEvents || 1} tone="amber" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Average response time</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{formatMinutes(summary.totals.avgResponseTimeMinutes)}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Customers needing follow-up</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{formatMetric(summary.totals.recoveryNeeded)}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Recent customer activity" description="The latest payment, message, and reply events across the organization.">
          <ActivityFeed
            items={summary.recentActivity}
            emptyCopy="No customer activity has been captured yet. As soon as Square and Twilio are live, this feed will start to populate."
          />
        </SectionCard>

        <SectionCard title="Needs owner attention" description="Customers who may need a personal follow-up before asking for a public review.">
          <ActivityFeed
            items={summary.negativeFeedback}
            emptyCopy="No recent replies currently need owner follow-up."
          />
        </SectionCard>

        <SectionCard title="Review-ready customers" description="Recent positive responders who are strongest candidates for a public review invitation.">
          <ActivityFeed
            items={summary.positiveCustomers}
            emptyCopy="No review-ready replies yet. Positive responses will appear here automatically."
          />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_1fr]">
        <SectionCard title="Delivery watchlist" description="The main reasons outbound texts were not delivered successfully.">
          {summary.topFailureReasons.length ? (
            <div className="space-y-3">
              {summary.topFailureReasons.map((failure) => (
                <div key={failure.reason} className="flex items-center justify-between rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-3 text-sm text-slate-950">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    {failure.reason}
                  </div>
                  <div className="text-sm font-medium text-slate-600">{formatMetric(failure.count)}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState copy="No delivery issues were recorded in the current reporting window." />
          )}
        </SectionCard>

        <SectionCard title="Current setup" description="The live configuration this organization is using right now.">
          <div className="grid gap-3">
            <SummaryRow label="Review destination" value={settingsSummary.googleReviewUrl ?? "Not configured"} tone={settingsSummary.googleReviewUrl ? "positive" : "negative"} />
            <SummaryRow label="Twilio sending number" value={settingsSummary.twilioPhoneNumber ?? "Not configured"} tone={settingsSummary.twilioPhoneNumber ? "positive" : "negative"} />
            <SummaryRow label="Square location" value={settingsSummary.squareLocationId ?? "Not configured"} tone={settingsSummary.squareLocationId ? "positive" : "negative"} />
            <SummaryRow label="Automatic sends" value={settingsSummary.autoSendEnabled ? "Enabled" : "Disabled"} tone={settingsSummary.autoSendEnabled ? "positive" : "negative"} />
            <SummaryRow label="Delivered messages" value={formatMetric(summary.totals.messagesDelivered)} />
            <SummaryRow label="Failed messages" value={formatMetric(summary.totals.messageFailures)} tone={summary.totals.messageFailures > 0 ? "negative" : "positive"} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
