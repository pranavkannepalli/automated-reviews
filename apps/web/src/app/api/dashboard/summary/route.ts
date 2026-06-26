import { NextResponse } from "next/server";

import { getActiveOrganization, requireSession } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/dashboard";

export async function GET(request: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? 5);
  const { activeMembership } = await getActiveOrganization(session.user.id);

  if (!activeMembership) {
    return NextResponse.json({ error: "No active organization" }, { status: 404 });
  }

  const summary = await getDashboardSummary(activeMembership.organization_id, days);
  return NextResponse.json(summary);
}
