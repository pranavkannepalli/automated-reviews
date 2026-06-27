"use client";

import { useState } from "react";
import { Beaker, ChevronDown } from "lucide-react";

import type { DemoActionState } from "@/lib/actions";

const INITIAL_STATE: DemoActionState = {};

export function DemoControls({ organizationId }: { organizationId: string }) {
  const [seedState, setSeedState] = useState(INITIAL_STATE);
  const [seedPending, setSeedPending] = useState(false);

  async function seedAction(formData: FormData) {
    setSeedPending(true);
    setSeedState(INITIAL_STATE);

    try {
      const response = await fetch("/api/demo/send-sample", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: String(formData.get("organizationId") ?? ""),
          phoneNumber: String(formData.get("phoneNumber") ?? "").trim(),
        }),
      });

      const result = (await response.json().catch(() => ({ error: "Failed to parse response." }))) as DemoActionState;
      setSeedState(result);
    } catch {
      setSeedState({ error: "Failed to create the demo event." });
    } finally {
      setSeedPending(false);
    }
  }

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
          Use this only if you need to simulate a real customer during a walkthrough. It creates a mock payment for the phone number you enter and queues the first message through Temporal.
        </div>

        <div className="mt-4">
          <DemoCard
            title="Send a sample customer through the flow"
            description="Enter a phone number to create a realistic payment event, open a review request, and hand the first outbound message to the Temporal worker."
            icon={<Beaker className="h-5 w-5" />}
            pending={seedPending}
            action={seedAction}
            state={seedState}
            buttonLabel="Create event and queue message"
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
  action: (payload: FormData) => Promise<void>;
  state: DemoActionState;
  organizationId: string;
}) {
  return (
    <form
      action={async (formData) => {
        await action(formData);
      }}
      className="rounded-[24px] border border-slate-200 bg-white p-5"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">{icon}</div>
      <h3 className="mt-5 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <label className="mt-5 block space-y-2">
        <span className="text-sm font-medium text-slate-700">Customer phone number</span>
        <input
          name="phoneNumber"
          type="tel"
          required
          placeholder="+14155550123"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-500"
        />
      </label>
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
