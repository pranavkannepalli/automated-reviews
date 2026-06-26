import { NextResponse } from "next/server";

import { getAppUrl } from "@/lib/env";
import { processSquareWebhook, verifySquareSignature } from "@/lib/webhooks";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-square-hmacsha256-signature");
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? null;

  if (signatureHeader && signatureKey) {
    const isValid = verifySquareSignature({
      body: rawBody,
      signatureHeader,
      signatureKey,
      notificationUrl: `${getAppUrl()}/api/webhooks/square`,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid Square signature" }, { status: 401 });
    }
  }

  const payload = JSON.parse(rawBody);
  const result = await processSquareWebhook(payload);

  return NextResponse.json(result);
}
