import { NextResponse } from "next/server";

import { setActiveOrganizationCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const organizationId = String(formData.get("organizationId") ?? "").trim();

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  await setActiveOrganizationCookie(organizationId);
  return NextResponse.json({ success: true });
}
