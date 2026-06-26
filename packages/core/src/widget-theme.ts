export type WidgetThemeConfig = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  radius: number;
  shadow: string;
  layout: "carousel" | "grid";
  showHeader: boolean;
  showStars: boolean;
  autoplay: boolean;
  intervalMs: number;
};

const DEFAULT_THEME: WidgetThemeConfig = {
  background: "#08111f",
  surface: "rgba(9, 17, 31, 0.88)",
  text: "#f8fafc",
  muted: "#94a3b8",
  accent: "#22d3ee",
  border: "rgba(255, 255, 255, 0.08)",
  radius: 28,
  shadow: "0 24px 80px rgba(5, 10, 22, 0.28)",
  layout: "carousel",
  showHeader: true,
  showStars: true,
  autoplay: true,
  intervalMs: 4500,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value == null) {
    return fallback;
  }

  return value === "true" || value === "1";
}

export function parseWidgetThemeForTest(searchParams: Record<string, string | undefined>): WidgetThemeConfig {
  const layout = searchParams.layout;
  const radius = Number(searchParams.radius ?? DEFAULT_THEME.radius);
  const intervalMs = Number(searchParams.intervalMs ?? DEFAULT_THEME.intervalMs);

  return {
    background: searchParams.bg ?? DEFAULT_THEME.background,
    surface: searchParams.surface ?? DEFAULT_THEME.surface,
    text: searchParams.text ?? DEFAULT_THEME.text,
    muted: searchParams.muted ?? DEFAULT_THEME.muted,
    accent: searchParams.accent ?? DEFAULT_THEME.accent,
    border: searchParams.border ?? DEFAULT_THEME.border,
    radius: Number.isFinite(radius) ? clamp(radius, 12, 48) : DEFAULT_THEME.radius,
    shadow: searchParams.shadow ?? DEFAULT_THEME.shadow,
    layout: layout === "grid" ? "grid" : "carousel",
    showHeader: parseBoolean(searchParams.showHeader, DEFAULT_THEME.showHeader),
    showStars: parseBoolean(searchParams.showStars, DEFAULT_THEME.showStars),
    autoplay: parseBoolean(searchParams.autoplay, DEFAULT_THEME.autoplay),
    intervalMs: Number.isFinite(intervalMs) ? clamp(intervalMs, 2500, 15000) : DEFAULT_THEME.intervalMs,
  };
}
