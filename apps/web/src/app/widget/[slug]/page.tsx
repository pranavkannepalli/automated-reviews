import { notFound } from "next/navigation";

import { ReviewWidget } from "@/components/review-widget";
import { getWidgetDataBySlug, parseWidgetTheme } from "@/lib/widget";

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const data = await getWidgetDataBySlug(slug);

  if (!data) {
    notFound();
  }

  const theme = parseWidgetTheme(query);
  if (!query.accent) {
    theme.accent = data.organization.primaryColor || theme.accent;
  }

  return <ReviewWidget data={data} theme={theme} />;
}
