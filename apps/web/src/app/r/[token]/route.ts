import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createSupabaseAdminClient();

  const { data: reviewRequest, error } = await supabase
    .from("review_requests")
    .select("id, organization_id, payment_event_id, customer_id, review_destination_url, tracking_token, review_prompt_clicked_at")
    .eq("tracking_token", token)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!reviewRequest?.review_destination_url) {
    return NextResponse.redirect(new URL("/app", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  if (!reviewRequest.review_prompt_clicked_at) {
    const now = new Date().toISOString();

    await supabase
      .from("review_requests")
      .update({
        review_prompt_clicked_at: now,
        status: "review_prompt_clicked",
      })
      .eq("id", reviewRequest.id);

    await supabase.from("message_events").insert({
      organization_id: reviewRequest.organization_id,
      review_request_id: reviewRequest.id,
      payment_event_id: reviewRequest.payment_event_id,
      customer_id: reviewRequest.customer_id,
      provider: "system",
      direction: "internal",
      message_type: "review_link_clicked",
      status: "clicked",
      message_body: reviewRequest.review_destination_url,
      occurred_at: now,
    });
  }

  return NextResponse.redirect(reviewRequest.review_destination_url);
}
