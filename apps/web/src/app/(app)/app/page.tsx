import { DemoControls } from "@/components/demo-controls";
import { DashboardView } from "@/components/dashboard-ui";
import { bootstrapOrganizationAction } from "@/lib/actions";
import { getActiveOrganization, requireSession } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/dashboard";

export default async function DashboardPage() {
  const session = await requireSession();
  const { memberships, activeMembership } = await getActiveOrganization(session.user.id);

  if (!memberships.length || !activeMembership) {
    return (
      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/8 bg-slate-950/80 p-6">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Organization bootstrap</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Create your first workspace</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
            This app is multi-organization by default. Bootstrap one workspace now, then wire in your Square location and Twilio number from settings.
          </p>
        </section>
        <form action={bootstrapOrganizationAction} className="rounded-[32px] border border-white/8 bg-slate-950/80 p-6">
          <div className="grid gap-4">
            <Field label="Organization name" name="name" placeholder="Northstar Dental" />
            <Field label="Business type" name="businessType" placeholder="Dental clinic" />
            <Field label="Primary brand color" name="primaryColor" placeholder="#2dd4bf" defaultValue="#2dd4bf" />
            <button type="submit" className="mt-2 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950">
              Create workspace
            </button>
          </div>
        </form>
      </div>
    );
  }

  const summary = await getDashboardSummary(activeMembership.organization_id, 5);

  return (
    <div className="space-y-8">
      <DemoControls organizationId={activeMembership.organization_id} />
      <DashboardView
        organizationName={activeMembership.organization.name}
        summary={summary}
        settingsSummary={{
          googleReviewUrl: activeMembership.settings?.google_review_url ?? null,
          twilioPhoneNumber: activeMembership.settings?.twilio_phone_number ?? null,
          squareLocationId: activeMembership.settings?.square_location_id ?? null,
          autoSendEnabled: activeMembership.settings?.auto_send_enabled ?? false,
        }}
      />
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <input
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
      />
    </label>
  );
}
