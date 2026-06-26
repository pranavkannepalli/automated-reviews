import { parseWidgetThemeForTest } from "@automated-reviews/core";

import { hasSupabaseEnv } from "./env";
import { createSupabaseServerClient } from "./supabase";

export type PublicReviewItem = {
  id: string;
  created_at: string;
  score: number | null;
  free_text: string | null;
  customer_name: string;
};

export type WidgetData = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string;
    businessType: string | null;
  };
  reviews: PublicReviewItem[];
};

export type WidgetTheme = ReturnType<typeof parseWidgetThemeForTest>;

export function parseWidgetTheme(searchParams: Record<string, string | string[] | undefined>): WidgetTheme {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return parseWidgetThemeForTest({
    bg: get("bg"),
    surface: get("surface"),
    text: get("text"),
    muted: get("muted"),
    accent: get("accent"),
    border: get("border"),
    shadow: get("shadow"),
    layout: get("layout"),
    radius: get("radius"),
    showHeader: get("showHeader"),
    showStars: get("showStars"),
    autoplay: get("autoplay"),
    intervalMs: get("intervalMs"),
  });
}

export async function getWidgetDataBySlug(slug: string): Promise<WidgetData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createSupabaseServerClient();
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, primary_color, business_type")
    .eq("slug", slug)
    .maybeSingle();

  if (orgError) {
    throw orgError;
  }

  if (!organization) {
    return null;
  }

  const { data: feedbackRows, error: feedbackError } = await supabase
    .from("feedback_responses")
    .select("id, created_at, score, free_text, customer:customers(first_name,last_name)")
    .eq("organization_id", organization.id)
    .eq("sentiment_bucket", "positive")
    .not("free_text", "is", null)
    .order("created_at", { ascending: false })
    .limit(12);

  if (feedbackError) {
    throw feedbackError;
  }

  const reviews = ((feedbackRows ?? []) as Array<{
    id: string;
    created_at: string;
    score: number | null;
    free_text: string | null;
    customer?: { first_name?: string | null; last_name?: string | null } | Array<{ first_name?: string | null; last_name?: string | null }>;
  }>).map((row) => {
    const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer;
    const firstName = customer?.first_name?.trim() ?? "";
    const lastInitial = customer?.last_name?.trim()?.[0];
    const customerName = [firstName, lastInitial ? `${lastInitial}.` : ""].filter(Boolean).join(" ") || "Verified customer";

    return {
      id: row.id,
      created_at: row.created_at,
      score: row.score,
      free_text: row.free_text,
      customer_name: customerName,
    };
  });

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logoUrl: organization.logo_url,
      primaryColor: organization.primary_color,
      businessType: organization.business_type,
    },
    reviews,
  };
}
