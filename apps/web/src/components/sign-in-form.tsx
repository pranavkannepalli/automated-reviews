"use client";

import { useActionState } from "react";

import { sendMagicLinkAction } from "@/lib/actions";

export function SignInForm() {
  const [state, action, pending] = useActionState(sendMagicLinkAction, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="owner@northstar.com"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-500"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Optional if you are using a shared internal demo account."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Continue"}
      </button>
      <p className="text-xs leading-5 text-slate-500">
        Leave the password blank to receive a secure magic link. Use a password only if your team already maintains a direct sign-in account.
      </p>
      {state?.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
    </form>
  );
}
