import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthenticationRequiredError } from "@/lib/auth";
import { seedMockPaymentEvent } from "@/lib/demo";

const bodySchema = z.object({
  organizationId: z.string().uuid(),
  phoneNumber: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await seedMockPaymentEvent(parsed.data);
    const status = result.error ? 400 : 200;
    return NextResponse.json(result, { status });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    console.error("[api/demo/send-sample] failed", error);
    return NextResponse.json({ error: "Failed to create demo event." }, { status: 500 });
  }
}
