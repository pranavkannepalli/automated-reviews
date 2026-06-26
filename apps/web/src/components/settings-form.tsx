import { updateSettingsAction } from "@/lib/actions";
import type { OrganizationMembership } from "@/lib/auth";
import { getAppUrl } from "@/lib/env";

export function SettingsForm({ membership }: { membership: OrganizationMembership }) {
  const organization = membership.organization;
  const settings = membership.settings;
  const appUrl = getAppUrl();
  const widgetUrl = `${appUrl}/widget/${organization.slug}`;
  const defaultEmbedCode = `<iframe src="${widgetUrl}" width="100%" height="420" style="border:0;display:block;" loading="lazy"></iframe>`;
  const themedEmbedCode = `<iframe src="${widgetUrl}?layout=grid&bg=%23ffffff&surface=%23f8fafc&text=%230f172a&muted=%23475569&accent=${encodeURIComponent(organization.primary_color)}&border=rgba(15,23,42,0.08)&radius=24" width="100%" height="640" style="border:0;display:block;" loading="lazy"></iframe>`;

  return (
    <form action={updateSettingsAction} className="grid gap-8">
      <input type="hidden" name="organizationId" value={organization.id} />

      <div className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-[32px] border border-white/8 bg-slate-950/80 p-6">
          <h2 className="text-xl font-semibold text-white">Organization profile</h2>
          <p className="mt-1 text-sm text-slate-400">Brand, routing, and presentation settings for the active workspace.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Organization name" name="name" defaultValue={organization.name} />
            <Field label="Slug" name="slug" defaultValue={organization.slug} />
            <Field label="Primary color" name="primaryColor" defaultValue={organization.primary_color} />
            <Field label="Business type" name="businessType" defaultValue={organization.business_type ?? ""} />
            <Field label="Logo URL" name="logoUrl" defaultValue={organization.logo_url ?? ""} />
            <Field label="Timezone" name="timezone" defaultValue={organization.timezone} />
          </div>
        </section>

        <section className="rounded-[32px] border border-white/8 bg-slate-950/80 p-6">
          <h2 className="text-xl font-semibold text-white">Messaging + payments</h2>
          <p className="mt-1 text-sm text-slate-400">Twilio and Square IDs used to route and deliver events.</p>
          <div className="mt-6 grid gap-4">
            <Field label="Google review URL" name="googleReviewUrl" defaultValue={settings?.google_review_url ?? ""} />
            <Field
              label="Tracked review destination URL"
              name="reviewDestinationUrl"
              defaultValue={settings?.review_destination_url ?? ""}
            />
            <Field label="Yelp review URL" name="yelpReviewUrl" defaultValue={settings?.yelp_review_url ?? ""} />
            <Field label="Twilio number" name="twilioPhoneNumber" defaultValue={settings?.twilio_phone_number ?? ""} />
            <Field label="Twilio account SID" name="twilioAccountSid" defaultValue={settings?.twilio_account_sid ?? ""} />
            <Field label="Square location ID" name="squareLocationId" defaultValue={settings?.square_location_id ?? ""} />
            <Field
              label="Message delay minutes"
              name="messageDelayMinutes"
              defaultValue={String(settings?.message_delay_minutes ?? 120)}
              type="number"
            />
            <label className="flex items-center justify-between rounded-3xl border border-white/8 bg-white/3 px-4 py-4">
              <div>
                <p className="text-sm font-medium text-white">Auto-send SMS after payment</p>
                <p className="mt-1 text-sm text-slate-400">Disable this to queue review requests without sending immediately.</p>
              </div>
              <input
                type="checkbox"
                name="autoSendEnabled"
                defaultChecked={settings?.auto_send_enabled ?? true}
                className="h-5 w-5 accent-cyan-300"
              />
            </label>
            <button
              type="submit"
              className="mt-2 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950"
            >
              Save settings
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-[32px] border border-white/8 bg-slate-950/80 p-6">
        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-xl font-semibold text-white">Public testimonial widget</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Embed recent positive customer feedback anywhere with a public iframe. The widget pulls from positive SMS responses already stored in this organization.
            </p>
            <div className="mt-6 space-y-4">
              <InfoRow label="Public widget URL" value={widgetUrl} />
              <InfoRow label="API JSON" value={`${appUrl}/api/public/widget/${organization.slug}`} />
              <InfoRow label="Default accent color" value={organization.primary_color} />
            </div>
          </div>
          <div className="space-y-5">
            <CodeBlock label="Default iframe embed" value={defaultEmbedCode} />
            <CodeBlock label="Styled iframe embed example" value={themedEmbedCode} />
            <div className="rounded-3xl border border-white/8 bg-white/3 p-4 text-sm text-slate-300">
              <p className="font-medium text-white">Theme params</p>
              <p className="mt-2 leading-6 text-slate-400">
                Supported query params: `layout`, `bg`, `surface`, `text`, `muted`, `accent`, `border`, `radius`, `showHeader`, `showStars`, `autoplay`, `intervalMs`.
              </p>
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        type={type}
        className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
      />
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/3 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-[#020617] p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-cyan-100">
        <code>{value}</code>
      </pre>
    </div>
  );
}
