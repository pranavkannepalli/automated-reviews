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
        <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Active organization settings</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Routing and branding</h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-slate-300">
          Configure the review links, Twilio sender, Square location, message delay, and public testimonial widget that control the automation flow.
        </p>
      </div>
      <SettingsForm membership={activeMembership} />
    </div>
  );
}
