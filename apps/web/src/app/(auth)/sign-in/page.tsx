import type { ReactNode } from "react";
import { ShieldCheck, Sparkles, Workflow } from "lucide-react";

import { SignInForm } from "@/components/sign-in-form";
import { hasSupabaseEnv } from "@/lib/env";

export default function SignInPage() {
  const envReady = hasSupabaseEnv();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)] xl:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
            Automated Reviews
          </div>
          <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            Turn everyday customer visits into a dependable review pipeline.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Give the owner one place to monitor payments, outbound messages, replies, and review opportunities without exposing internal test controls.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <FeatureCard icon={<Workflow className="h-5 w-5" />} title="Payment to outreach" description="Square activity can trigger review requests automatically." />
            <FeatureCard icon={<ShieldCheck className="h-5 w-5" />} title="Private service recovery" description="Lower scores stay off public channels and can be handled directly." />
            <FeatureCard icon={<Sparkles className="h-5 w-5" />} title="Owner-ready reporting" description="See delivery health, reply rates, and review momentum at a glance." />
          </div>
        </section>

        <section className="rounded-[40px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfd_100%)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)] xl:p-10">
          <p className="text-sm uppercase tracking-[0.32em] text-slate-400">Sign in</p>
          <h2 className="mt-4 text-3xl font-semibold text-slate-950">Access your workspace</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Use email sign-in to open the dashboard. If this is a brand new account, you can create the first business workspace after login.
          </p>
          <div className="mt-8">
            <SignInForm />
          </div>
          {!envReady ? (
            <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Setup required: add the Supabase environment values from `.env.example` before sign-in can succeed.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">{icon}</div>
      <h3 className="mt-5 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
