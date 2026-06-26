"use client";

import { useActionState } from "react";
import { Beaker, ChevronDown, MessageSquareShare } from "lucide-react";

import {
  forceFirstMessageAction,
  seedMockPaymentEventAction,
  type DemoActionState,
} from "@/lib/actions";

const INITIAL_STATE: DemoActionState = {};

export function DemoControls({ organizationId }: { organizationId: string }) {
  const [seedState, seedAction, seedPending] = useActionState(seedMockPaymentEventAction, INITIAL_STATE);
  const [sendState, sendAction, sendPending] = useActionState(forceFirstMessageAction, INITIAL_STATE);

  return (
    <details className="group rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7fafc_100%)] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.05)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Internal preview tools</p>
          <h2 className="mt-2 text-base font-semibold text-slate-950">Operations blueprint</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Hidden support tools for internal demos and QA. Keep this collapsed when presenting to business owners.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition group-open:rotate-180">
          <ChevronDown className="h-5 w-5" />
        </div>
      </summary>

      <div className="mt-5 rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_36%),linear-gradient(180deg,#f8fbff_0%,#f5f7fb_100%)] p-4">
        <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-500">
          Use these tools only if you need to simulate data during a walkthrough. They create a mock payment event and can force the first message without waiting on the normal delay.
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <DemoCard
            title="Create sample payment"
            description="Generates a realistic test payment and queues a fresh review request."
            icon={<Beaker className="h-5 w-5" />}
            pending={seedPending}
            action={seedAction}
            state={seedState}
            buttonLabel="Create sample event"
            organizationId={organizationId}
          />
          <DemoCard
            title="Send first message now"
            description="Immediately processes the first outbound text for the newest queued request."
            icon={<MessageSquareShare className="h-5 w-5" />}
            pending={sendPending}
            action={sendAction}
            state={sendState}
            buttonLabel="Send now"
            organizationId={organizationId}
          />
        </div>
      </div>
    </details>
  );
}

function DemoCard({
  title,
  description,
  icon,
  buttonLabel,
  pending,
  action,
  state,
  organizationId,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonLabel: string;
  pending: boolean;
  action: (payload: FormData) => void;
  state: DemoActionState;
  organizationId: string;
}) {
  return (
    <form action={action} className="rounded-[24px] border border-slate-200 bg-white p-5">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">{icon}</div>
      <h3 className="mt-5 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Running..." : buttonLabel}
      </button>
      {state.success ? <p className="mt-3 text-sm text-emerald-700">{state.success}</p> : null}
      {state.error ? <p className="mt-3 text-sm text-rose-700">{state.error}</p> : null}
      {state.details ? (
        <pre className="mt-3 whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600">
          {state.details}
        </pre>
      ) : null}
    </form>
  );
}
