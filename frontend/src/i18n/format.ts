/**
 * Locale-aware number, date and relative-time formatting.
 *
 * Every user-facing figure goes through `Intl` here — no hand-built strings, so
 * Azerbaijani and Russian get their own decimal separators, month names and
 * plural-aware wording for free.
 */

import { DEFAULT_LANGUAGE, INTL_LOCALES, normalizeLanguage, type Language } from "./config";
import { i18n } from "./index";

export function activeLanguage(): Language {
  return normalizeLanguage(i18n.resolvedLanguage ?? i18n.language) ?? DEFAULT_LANGUAGE;
}

export function localeFor(language: Language = activeLanguage()): string {
  return INTL_LOCALES[language];
}

export function formatNumber(value: number, language?: Language): string {
  return new Intl.NumberFormat(localeFor(language)).format(value);
}

export function formatDecimal(value: number, digits = 2, language?: Language): string {
  return new Intl.NumberFormat(localeFor(language), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Signed score, e.g. `+0,42` / `-0,42`. */
export function formatSigned(value: number, digits = 2, language?: Language): string {
  const formatted = formatDecimal(Math.abs(value), digits, language);
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatted}`;
}

export function formatDateTime(iso: string, language?: Language): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string, language?: Language): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatShortDate(iso: string, language?: Language): string {
  return new Intl.DateTimeFormat(localeFor(language), { day: "2-digit", month: "short" }).format(
    new Date(iso),
  );
}

const RELATIVE_STEPS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

/**
 * "just now" / "5 minutes ago" / "3 дня назад" — plural rules handled by Intl.
 * `style: "narrow"` gives the compact form used in list rows ("5m ago").
 */
export function formatRelativeTime(
  iso: string,
  language?: Language,
  style: Intl.RelativeTimeFormatStyle = "long",
): string {
  const formatter = new Intl.RelativeTimeFormat(localeFor(language), { numeric: "auto", style });
  const diffSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  for (const [unit, seconds] of RELATIVE_STEPS) {
    if (Math.abs(diffSeconds) >= seconds || unit === "second") {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return formatter.format(0, "second");
}
