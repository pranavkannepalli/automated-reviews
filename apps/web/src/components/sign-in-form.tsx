"use client";

import { useActionState } from "react";

import { sendMagicLinkAction } from "@/lib/actions";

export function SignInForm() {
  const [state, action, pending] = useActionState(sendMagicLinkAction, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="email">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="owner@northstar.com"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Optional. Use for direct sign-in."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-xs leading-5 text-slate-500">
        Leave password blank to use a magic link. Add a password to sign in directly with a shared demo account.
      </p>
      {state?.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-300">{state.success}</p> : null}
    </form>
  );
}
