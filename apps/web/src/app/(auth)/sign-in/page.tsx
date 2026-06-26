import type { ReactNode } from "react";
import { ShieldCheck, Sparkles, Workflow } from "lucide-react";

import { SignInForm } from "@/components/sign-in-form";
import { hasSupabaseEnv } from "@/lib/env";

export default function SignInPage() {
  const envReady = hasSupabaseEnv();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[40px] border border-white/10 bg-slate-950/75 p-8 shadow-[0_24px_120px_rgba(0,0,0,0.45)] backdrop-blur xl:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-4 py-2 text-xs font-medium uppercase tracking-[0.32em] text-cyan-200">
            Automated Reviews
          </div>
          <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Move from payment event to review prompt without losing the unhappy customers in public.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            One workspace for Square ingestion, Twilio feedback routing, and a 5-day operations dashboard for every organization you manage.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <FeatureCard icon={<Workflow className="h-5 w-5" />} title="Payment to SMS" description="Square webhooks create review requests automatically." />
            <FeatureCard icon={<ShieldCheck className="h-5 w-5" />} title="Private recovery" description="Scores 1-3 stay private and go straight to follow-up." />
            <FeatureCard icon={<Sparkles className="h-5 w-5" />} title="Dense analytics" description="Reply rates, delivery health, and review prompts over 5 days." />
          </div>
        </section>

        <section className="rounded-[40px] border border-white/10 bg-white/4 p-8 shadow-[0_24px_120px_rgba(0,0,0,0.35)] backdrop-blur xl:p-10">
          <p className="text-sm uppercase tracking-[0.32em] text-slate-400">Sign in</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">Email magic link</h2>
          <p className="mt-3 text-base leading-7 text-slate-300">
            Use Supabase Auth to enter your workspace. The first login can bootstrap an organization from inside the app.
          </p>
          <div className="mt-8">
            <SignInForm />
          </div>
          {!envReady ? (
            <div className="mt-6 rounded-3xl border border-amber-300/20 bg-amber-300/8 p-4 text-sm text-amber-100">
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
    <div className="rounded-[28px] border border-white/8 bg-white/4 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">{icon}</div>
      <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
