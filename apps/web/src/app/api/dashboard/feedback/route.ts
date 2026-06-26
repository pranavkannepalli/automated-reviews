import { NextResponse } from "next/server";

import { getFeedbackFeed } from "@/lib/dashboard";
import { getActiveOrganization, requireSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? 5);
  const { activeMembership } = await getActiveOrganization(session.user.id);

  if (!activeMembership) {
    return NextResponse.json({ error: "No active organization" }, { status: 404 });
  }

  const items = await getFeedbackFeed(activeMembership.organization_id, days);
  return NextResponse.json(items);
}
