import { clsx, type ClassValue } from "clsx";
import { formatDistanceToNowStrict } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatMetric(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatMinutes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0m";
  }

  return `${Math.round(value)}m`;
}

export function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function relativeTime(timestamp: string) {
  return formatDistanceToNowStrict(new Date(timestamp), { addSuffix: true });
}
