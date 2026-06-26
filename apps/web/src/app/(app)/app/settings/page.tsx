import { SettingsForm } from "@/components/settings-form";
import { getActiveOrganization, requireSession } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await requireSession();
  const { activeMembership } = await getActiveOrganization(session.user.id);

  if (!activeMembership) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Configuration</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Brand, routing, and live integrations</h1>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          This is where you choose the review destination, connect the Twilio sender, map the Square location, and publish the testimonial widget you want customers to see.
        </p>
      </div>
      <SettingsForm membership={activeMembership} />
    </div>
  );
}
