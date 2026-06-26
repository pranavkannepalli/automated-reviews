"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "./supabase";
import { getAppUrl, hasSupabaseEnv } from "./env";
import { requireSession, setActiveOrganizationCookie } from "./auth";
import { processSquareWebhook, sendInitialReviewRequestNow } from "./webhooks";

type ActionState = {
  error?: string;
  success?: string;
};

export type DemoActionState = {
  error?: string;
  success?: string;
  details?: string;
};

export async function sendMagicLinkAction(_: ActionState | null, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv()) {
    return { error: "Supabase env is missing. Add the required keys before signing in." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createSupabaseServerClient();

  if (password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    redirect("/app");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/app`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Check your email for the sign-in link." };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function bootstrapOrganizationAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  // Supabase RPC typing is generated from schema in real deployments. Keep the integration permissive here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createSupabaseServerClient();

  const name = String(formData.get("name") ?? "").trim();
  const businessType = String(formData.get("businessType") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "#2563eb").trim();

  if (!name) {
    throw new Error("Organization name is required.");
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  const { data, error } = await supabase.rpc("bootstrap_organization", {
    input_name: name,
    input_slug: slug || `org-${session.user.id.slice(0, 8)}`,
    input_business_type: businessType || "General",
    input_primary_color: primaryColor,
  });

  if (error) {
    throw new Error(error.message);
  }

  await setActiveOrganizationCookie(String(data));
  redirect("/app");
}

export async function updateSettingsAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createSupabaseServerClient();
  const organizationId = String(formData.get("organizationId") ?? "");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!membership) {
    throw new Error("You do not have access to this organization.");
  }

  const orgPayload = {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    primary_color: String(formData.get("primaryColor") ?? "#2563eb").trim(),
    logo_url: String(formData.get("logoUrl") ?? "").trim() || null,
    business_type: String(formData.get("businessType") ?? "").trim() || null,
    timezone: String(formData.get("timezone") ?? "America/Los_Angeles").trim(),
  };

  const settingsPayload = {
    organization_id: organizationId,
    google_review_url: String(formData.get("googleReviewUrl") ?? "").trim() || null,
    review_destination_url: String(formData.get("reviewDestinationUrl") ?? "").trim() || null,
    yelp_review_url: String(formData.get("yelpReviewUrl") ?? "").trim() || null,
    twilio_phone_number: String(formData.get("twilioPhoneNumber") ?? "").trim() || null,
    twilio_account_sid: String(formData.get("twilioAccountSid") ?? "").trim() || null,
    square_location_id: String(formData.get("squareLocationId") ?? "").trim() || null,
    message_delay_minutes: Number(formData.get("messageDelayMinutes") ?? 120),
    auto_send_enabled: formData.get("autoSendEnabled") === "on",
  };

  const { error: orgError } = await supabase
    .from("organizations")
    .update(orgPayload)
    .eq("id", organizationId);

  if (orgError) {
    throw new Error(orgError.message);
  }

  const { error: settingsError } = await supabase
    .from("organization_settings")
    .upsert(settingsPayload, { onConflict: "organization_id" });

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/settings");
}

const MOCK_STORE_SCENARIOS = [
  {
    storeName: "Northstar Dental",
    amount: 18500,
    firstName: "Maya",
    lastName: "Ortiz",
    phone: "+14155550123",
  },
  {
    storeName: "Cedar Auto Spa",
    amount: 7200,
    firstName: "Jordan",
    lastName: "Lee",
    phone: "+14155550124",
  },
  {
    storeName: "Luma Med Spa",
    amount: 24900,
    firstName: "Sofia",
    lastName: "Nguyen",
    phone: "+14155550125",
  },
];

function formatDemoDetails(lines: string[]) {
  return lines.join("\n");
}

export async function seedMockPaymentEventAction(
  _: DemoActionState,
  formData: FormData,
): Promise<DemoActionState> {
  const session = await requireSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createSupabaseServerClient();
  const organizationId = String(formData.get("organizationId") ?? "");
  const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
  const scenario = MOCK_STORE_SCENARIOS[Math.floor(Math.random() * MOCK_STORE_SCENARIOS.length)];

  if (!phoneNumber) {
    return { error: "A phone number is required." };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You do not have access to this organization." };
  }

  const { data: settings } = await supabase
    .from("organization_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const locationId = settings?.square_location_id || `loc_demo_${organizationId.slice(0, 8)}`;
  if (!settings?.square_location_id) {
    await supabase.from("organization_settings").upsert(
      {
        organization_id: organizationId,
        square_location_id: locationId,
        message_delay_minutes: settings?.message_delay_minutes ?? 120,
        auto_send_enabled: settings?.auto_send_enabled ?? false,
      },
      { onConflict: "organization_id" },
    );
  }

  const timestamp = new Date().toISOString();
  const suffix = Date.now().toString().slice(-6);
  const payload = {
    type: "payment.created",
    event_id: `evt_demo_${suffix}`,
    created_at: timestamp,
    data: {
      object: {
        payment: {
          id: `pay_demo_${suffix}`,
          status: "COMPLETED",
          amount_money: {
            amount: scenario.amount,
            currency: "USD",
          },
          location_id: locationId,
          buyer_email_address: `${scenario.firstName.toLowerCase()}@example.com`,
          customer_details: {
            given_name: scenario.firstName,
            family_name: scenario.lastName,
            phone_number: phoneNumber,
          },
        },
      },
    },
  };

  const result = await processSquareWebhook(payload);
  const reviewRequestId = "reviewRequestId" in result && typeof result.reviewRequestId === "string"
    ? result.reviewRequestId
    : null;

  if (!reviewRequestId) {
    revalidatePath("/app");

    return {
      error: "A mock payment was created, but no review request was returned.",
      details: formatDemoDetails([
        `store: ${scenario.storeName}`,
        `payment_event: ${payload.event_id}`,
        `customer_phone: ${phoneNumber}`,
        `result: ${JSON.stringify(result)}`,
      ]),
    };
  }

  const sendResult = await sendInitialReviewRequestNow(reviewRequestId);
  revalidatePath("/app");

  return {
    success: "Sample payment created and the first message was processed.",
    details: formatDemoDetails([
      `store: ${scenario.storeName}`,
      `payment_event: ${payload.event_id}`,
      `payment_id: ${payload.data.object.payment.id}`,
      `location_id: ${locationId}`,
      `customer: ${scenario.firstName} ${scenario.lastName} (${phoneNumber})`,
      `review_request: ${reviewRequestId}`,
      `send_mode: ${sendResult.mode}`,
      `result: ${JSON.stringify(result)}`,
    ]),
  };
}

export async function forceFirstMessageAction(
  _: DemoActionState,
  formData: FormData,
): Promise<DemoActionState> {
  const session = await requireSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createSupabaseServerClient();
  const organizationId = String(formData.get("organizationId") ?? "");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You do not have access to this organization." };
  }

  const { data: request } = await supabase
    .from("review_requests")
    .select("id, status")
    .eq("organization_id", organizationId)
    .in("status", ["queued", "draft", "sent_simulated"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request) {
    return { error: "No queued review request found. Seed a mock payment first." };
  }

  const result = await sendInitialReviewRequestNow(request.id);
  revalidatePath("/app");

  return {
    success: "First outreach processed.",
    details: formatDemoDetails([
      `review_request: ${request.id}`,
      `mode: ${result.mode}`,
      `customer_phone: ${result.customerPhone}`,
    ]),
  };
}
