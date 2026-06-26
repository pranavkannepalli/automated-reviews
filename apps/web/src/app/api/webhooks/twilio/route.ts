import { NextResponse } from "next/server";

import { processTwilioWebhook } from "@/lib/webhooks";

export async function POST(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const reviewRequestId = searchParams.get("reviewRequestId");
  const formData = await request.formData();
  const values = Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
  ) as Record<string, string>;

  const result = await processTwilioWebhook(values, reviewRequestId);
  return NextResponse.json(result);
}
