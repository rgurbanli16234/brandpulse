/** Small presentation helpers shared across pages. */

import type { PriorityTier, SentimentLabel } from "@/lib/api";

export const TIER_CLASSES: Record<PriorityTier, string> = {
  Low: "border-risk-low/40 bg-risk-low/15 text-risk-low",
  Medium: "border-risk-medium/40 bg-risk-medium/15 text-risk-medium",
  High: "border-risk-high/40 bg-risk-high/15 text-risk-high",
  Critical: "border-risk-critical/40 bg-risk-critical/15 text-risk-critical",
};

export const TIER_COLORS: Record<PriorityTier, string> = {
  Low: "var(--risk-low)",
  Medium: "var(--risk-medium)",
  High: "var(--risk-high)",
  Critical: "var(--risk-critical)",
};

export const SENTIMENT_TEXT: Record<SentimentLabel, string> = {
  strongly_negative: "Strongly negative",
  negative: "Negative",
  neutral: "Neutral",
  positive: "Positive",
};

export const SENTIMENT_COLORS: Record<SentimentLabel, string> = {
  positive: "var(--risk-low)",
  neutral: "var(--muted-foreground)",
  negative: "var(--risk-high)",
  strongly_negative: "var(--risk-critical)",
};

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTime(iso);
}
