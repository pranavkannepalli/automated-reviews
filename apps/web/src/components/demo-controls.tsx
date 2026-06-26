"use client";

import { useActionState } from "react";
import { Beaker, MessageSquareShare } from "lucide-react";

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
    <section className="rounded-[32px] border border-white/8 bg-slate-950/80 p-6 shadow-[0_24px_80px_rgba(5,10,22,0.45)]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Demo controls</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Manual test rig for Rehaan</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Generate a fake payment event and manually fire the first outreach message without waiting on Square or the default two-hour delay.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DemoCard
          title="Seed mock payment"
          description="Creates a realistic Square payment for one of several mock store scenarios and queues a review request."
          icon={<Beaker className="h-5 w-5" />}
          pending={seedPending}
          action={seedAction}
          state={seedState}
          buttonLabel="Create mock event"
          organizationId={organizationId}
        />
        <DemoCard
          title="Force first message"
          description="Immediately sends or simulates the first SMS for the newest queued request so the real LLM-backed flow can be tested on demand."
          icon={<MessageSquareShare className="h-5 w-5" />}
          pending={sendPending}
          action={sendAction}
          state={sendState}
          buttonLabel="Send first message"
          organizationId={organizationId}
        />
      </div>
    </section>
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
    <form action={action} className="rounded-[28px] border border-white/8 bg-white/3 p-5">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300">{icon}</div>
      <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
      >
        {pending ? "Running..." : buttonLabel}
      </button>
      {state.success ? <p className="mt-3 text-sm text-emerald-300">{state.success}</p> : null}
      {state.error ? <p className="mt-3 text-sm text-rose-300">{state.error}</p> : null}
      {state.details ? (
        <pre className="mt-3 whitespace-pre-wrap break-words rounded-2xl border border-white/8 bg-slate-950/75 p-3 text-xs leading-6 text-cyan-100">
          {state.details}
        </pre>
      ) : null}
    </form>
  );
}
