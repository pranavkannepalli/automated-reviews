import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Building2, Cog, LogOut } from "lucide-react";

import { OrganizationSwitcher } from "@/components/organization-switcher";
import { getActiveOrganization, requireSession } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { signOutAction } from "@/lib/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv()) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        <div className="rounded-[32px] border border-amber-200 bg-amber-50 p-6 text-amber-900">
          Supabase is not configured yet. Add the required environment variables, run the database migration, and reload the app.
        </div>
        <div className="mt-8">{children}</div>
      </div>
    );
  }

  const session = await requireSession();
  const { memberships, activeMembership } = await getActiveOrganization(session.user.id);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-4 py-4 md:px-6 md:py-6">
      <header className="rounded-[36px] border border-slate-200 bg-white/90 px-5 py-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#164e63_100%)] text-white">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Automated Reviews</p>
              <p className="text-lg font-semibold text-slate-950">
                {activeMembership?.organization.name ?? "Create your first organization"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Reputation operations for payment-triggered customer follow-up.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            {activeMembership ? (
              <div className="flex flex-wrap items-center gap-3">
                <OrganizationSwitcher
                  organizations={memberships.map((membership) => ({
                    id: membership.organization_id,
                    name: membership.organization.name,
                  }))}
                  activeOrganizationId={activeMembership.organization_id}
                />
                <form action={signOutAction}>
                  <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              </div>
            ) : null}
            <nav className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
              <NavLink href="/app" icon={<Building2 className="h-4 w-4" />} label="Overview" />
              <NavLink href="/app/settings" icon={<Cog className="h-4 w-4" />} label="Settings" />
            </nav>
          </div>
        </div>
      </header>
      <div className="flex-1 py-8">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:text-slate-950">
      {icon}
      {label}
    </Link>
  );
}
