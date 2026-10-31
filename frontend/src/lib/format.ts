/**
 * Small presentation helpers shared across pages.
 *
 * Only colours live here now: every label and every formatted figure comes from
 * the translation files (`@/lib/enums`) and from locale-aware `Intl` formatting
 * (`@/i18n/format`), so nothing is hard-coded in English any more.
 */

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

export const SENTIMENT_COLORS: Record<SentimentLabel, string> = {
  positive: "var(--risk-low)",
  neutral: "var(--muted-foreground)",
  negative: "var(--risk-high)",
  strongly_negative: "var(--risk-critical)",
};

export { formatDate, formatDateTime, formatNumber, formatShortDate } from "@/i18n/format";

import { formatRelativeTime } from "@/i18n/format";

/** Compact relative time for list rows: "5m ago" / "5 мин. назад" / "5 dəq. əvvəl". */
export function relativeTime(iso: string): string {
  return formatRelativeTime(iso, undefined, "narrow");
}
