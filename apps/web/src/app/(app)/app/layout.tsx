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
        <div className="rounded-[32px] border border-amber-300/20 bg-amber-300/8 p-6 text-amber-100">
          Supabase is not configured yet. Add the variables from `.env.example`, run the SQL migration, then reload the app.
        </div>
        <div className="mt-8">{children}</div>
      </div>
    );
  }

  const session = await requireSession();
  const { memberships, activeMembership } = await getActiveOrganization(session.user.id);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 md:px-6 md:py-6">
      <header className="rounded-[32px] border border-white/8 bg-slate-950/80 px-5 py-4 shadow-[0_24px_80px_rgba(5,10,22,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-300 to-emerald-300 text-slate-950">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Automated Reviews</p>
              <p className="text-lg font-semibold text-white">
                {activeMembership?.organization.name ?? "Create your first organization"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {activeMembership ? (
              <OrganizationSwitcher
                organizations={memberships.map((membership) => ({
                  id: membership.organization_id,
                  name: membership.organization.name,
                }))}
                activeOrganizationId={activeMembership.organization_id}
              />
            ) : null}
            <nav className="flex items-center gap-2">
              <NavLink href="/app" icon={<Building2 className="h-4 w-4" />} label="Dashboard" />
              <NavLink href="/app/settings" icon={<Cog className="h-4 w-4" />} label="Settings" />
              <form action={signOutAction}>
                <button className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-4 py-2 text-sm text-slate-200">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
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
    <Link href={href} className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-4 py-2 text-sm text-slate-200">
      {icon}
      {label}
    </Link>
  );
}
