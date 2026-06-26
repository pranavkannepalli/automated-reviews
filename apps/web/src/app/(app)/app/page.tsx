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
      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace setup</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Create your first location</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Start with the business you want to present tomorrow. Once the workspace is created, you can connect Square, choose your sending number, and tailor the review destination.
          </p>
        </section>
        <form action={bootstrapOrganizationAction} className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <div className="grid gap-4">
            <Field label="Organization name" name="name" placeholder="Northstar Dental" />
            <Field label="Business type" name="businessType" placeholder="Dental clinic" />
            <Field label="Primary brand color" name="primaryColor" placeholder="#2dd4bf" defaultValue="#2dd4bf" />
            <button type="submit" className="mt-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
              Create location
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
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-500"
      />
    </label>
  );
}
