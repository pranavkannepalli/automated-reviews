import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { hasSupabaseEnv } from "./env";
import { createSupabaseServerClient } from "./supabase";

type MembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  business_type: string | null;
  timezone: string;
  created_at: string;
};

type OrganizationSettingsRow = {
  id: string;
  organization_id: string;
  google_review_url: string | null;
  review_destination_url: string | null;
  yelp_review_url: string | null;
  twilio_phone_number: string | null;
  twilio_account_sid: string | null;
  square_location_id: string | null;
  message_delay_minutes: number;
  auto_send_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type OrganizationMembership = MembershipRow & {
  organization: OrganizationRow;
  settings: OrganizationSettingsRow | null;
};

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationRequiredError";
  }
}

export async function getSession() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { user } as { user: User };
}

export async function requireSession(options?: { onUnauthorized?: "redirect" | "error" }) {
  const session = await getSession();
  if (!session) {
    if (options?.onUnauthorized === "error") {
      throw new AuthenticationRequiredError();
    }

    redirect("/sign-in");
  }

  return session;
}

export async function getMemberships(userId: string): Promise<OrganizationMembership[]> {
  const supabase = await createSupabaseServerClient();
  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const organizationIds = ((memberships ?? []) as MembershipRow[]).map((membership) => membership.organization_id);
  if (!organizationIds.length) {
    return [];
  }

  const [{ data: organizations }, { data: settings }] = await Promise.all([
    supabase.from("organizations").select("*").in("id", organizationIds),
    supabase.from("organization_settings").select("*").in("organization_id", organizationIds),
  ]);

  const organizationMap = new Map<string, OrganizationRow>(
    ((organizations ?? []) as OrganizationRow[]).map((organization) => [organization.id, organization]),
  );
  const settingsMap = new Map<string, OrganizationSettingsRow>(
    ((settings ?? []) as OrganizationSettingsRow[]).map((setting) => [setting.organization_id, setting]),
  );

  return ((memberships ?? []) as MembershipRow[])
    .map((membership) => {
      const organization = organizationMap.get(membership.organization_id);
      if (!organization) {
        return null;
      }

      return {
        ...membership,
        organization,
        settings: settingsMap.get(membership.organization_id) ?? null,
      };
    })
    .filter((membership): membership is OrganizationMembership => Boolean(membership));
}

export async function getActiveOrganization(userId: string) {
  const memberships = await getMemberships(userId);
  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_organization_id")?.value;
  const activeMembership =
    memberships.find((membership) => membership.organization_id === activeOrgId) ??
    memberships[0] ??
    null;

  return {
    memberships,
    activeMembership,
  };
}

export async function setActiveOrganizationCookie(organizationId: string) {
  const cookieStore = await cookies();
  cookieStore.set("active_organization_id", organizationId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}
