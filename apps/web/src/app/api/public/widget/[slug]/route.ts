import { NextResponse } from "next/server";

import { getWidgetDataBySlug } from "@/lib/widget";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const data = await getWidgetDataBySlug(slug);

  if (!data) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
