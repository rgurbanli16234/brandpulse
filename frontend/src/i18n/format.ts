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

type RelativeUnit = "year" | "month" | "day" | "hour" | "minute" | "second";

const RELATIVE_STEPS: ReadonlyArray<readonly [RelativeUnit, number]> = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

/**
 * "5 hours ago" / "5 ч назад" / "5 saat əvvəl".
 *
 * This used to be `Intl.RelativeTimeFormat`, which is unusable here: its
 * `narrow` style is signed in Russian (`-5 ч`), Chromium ships no Azerbaijani
 * relative-time data at all (every style falls back to `-5 h`), and the two
 * engines disagree even for `az` short. The wording therefore lives in the
 * `common:time` bundle, so the output is the same on every ICU build.
 */
export function formatRelativeTime(iso: string, language?: Language): string {
  const lang = language ?? activeLanguage();
  const diffSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  for (const [unit, seconds] of RELATIVE_STEPS) {
    if (Math.abs(diffSeconds) >= seconds || unit === "second") {
      return relativePhrase(Math.round(diffSeconds / seconds), unit, lang);
    }
  }
  return relativePhrase(0, "second", lang);
}

/** Literal keys keep the typed `t()` overloads happy; `time.units.*` mirrors them. */
const TIME_KEYS = {
  now: "common:time.now",
  yesterday: "common:time.yesterday",
  tomorrow: "common:time.tomorrow",
  twoDaysAgo: "common:time.twoDaysAgo",
  twoDaysAhead: "common:time.twoDaysAhead",
  lastMonth: "common:time.lastMonth",
  nextMonth: "common:time.nextMonth",
  lastYear: "common:time.lastYear",
  nextYear: "common:time.nextYear",
  ago: "common:time.ago",
  in: "common:time.in",
} as const;

const UNIT_KEYS = {
  second: "common:time.units.second",
  minute: "common:time.units.minute",
  hour: "common:time.units.hour",
  day: "common:time.units.day",
  month: "common:time.units.month",
  year: "common:time.units.year",
} as const satisfies Record<RelativeUnit, string>;

type TimeKey = (typeof TIME_KEYS)[keyof typeof TIME_KEYS] | (typeof UNIT_KEYS)[keyof typeof UNIT_KEYS];

/** The `numeric: "auto"` wording ("yesterday", "позавчера") spelled out per locale. */
function relativePhrase(
  value: number,
  unit: RelativeUnit,
  language: Language,
): string {
  const t = (key: TimeKey, options?: { count?: number; unit?: string }) =>
    String(i18n.t(key, { lng: language, ...options }));

  if (value === 0) return t(TIME_KEYS.now);
  const past = value < 0;
  const count = Math.abs(value);
  if (unit === "day") {
    if (count === 1) return t(past ? TIME_KEYS.yesterday : TIME_KEYS.tomorrow);
    if (count === 2) return t(past ? TIME_KEYS.twoDaysAgo : TIME_KEYS.twoDaysAhead);
  }
  if (count === 1 && unit === "month") return t(past ? TIME_KEYS.lastMonth : TIME_KEYS.nextMonth);
  if (count === 1 && unit === "year") return t(past ? TIME_KEYS.lastYear : TIME_KEYS.nextYear);
  return t(past ? TIME_KEYS.ago : TIME_KEYS.in, { count, unit: t(UNIT_KEYS[unit]) });
}
