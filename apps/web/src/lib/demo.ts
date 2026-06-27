import { revalidatePath } from "next/cache";

import { getDemoProcessSquareWebhookOptions } from "@automated-reviews/core";

import { requireSession } from "./auth";
import { processSquareWebhook } from "./webhooks";
import { createSupabaseServerClient } from "./supabase";
import type { DemoActionState } from "./actions";

const MOCK_STORE_SCENARIOS = [
  {
    storeName: "Northstar Dental",
    amount: 18500,
    firstName: "Maya",
    lastName: "Ortiz",
  },
  {
    storeName: "Cedar Auto Spa",
    amount: 7200,
    firstName: "Jordan",
    lastName: "Lee",
  },
  {
    storeName: "Luma Med Spa",
    amount: 24900,
    firstName: "Sofia",
    lastName: "Nguyen",
  },
] as const;

function formatDemoDetails(lines: string[]) {
  return lines.join("\n");
}

export async function seedMockPaymentEvent({
  organizationId,
  phoneNumber,
}: {
  organizationId: string;
  phoneNumber: string;
}): Promise<DemoActionState> {
  const session = await requireSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createSupabaseServerClient();
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

  const result = await processSquareWebhook(payload, getDemoProcessSquareWebhookOptions());
  const reviewRequestId = "reviewRequestId" in result && typeof result.reviewRequestId === "string"
    ? result.reviewRequestId
    : null;

  revalidatePath("/app");

  if (!reviewRequestId) {
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

  return {
    success: "Sample payment created and the first message was queued.",
    details: formatDemoDetails([
      `store: ${scenario.storeName}`,
      `payment_event: ${payload.event_id}`,
      `payment_id: ${payload.data.object.payment.id}`,
      `location_id: ${locationId}`,
      `customer: ${scenario.firstName} ${scenario.lastName} (${phoneNumber})`,
      `review_request: ${reviewRequestId}`,
      `result: ${JSON.stringify(result)}`,
    ]),
  };
}
