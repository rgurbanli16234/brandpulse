/**
 * i18n configuration shared by the runtime, the typed keys and the switcher.
 *
 * English is the source of truth for keys; `az` and `ru` must mirror it.
 */

export const LANGUAGES = ["en", "az", "ru"] as const;
export type Language = (typeof LANGUAGES)[number];

export const NAMESPACES = [
  "common",
  "nav",
  "landing",
  "pricing",
  "blog",
  "audiences",
  "auth",
  "app",
  "errors",
] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

/** localStorage key holding the user's explicit language choice. */
export const LANGUAGE_STORAGE_KEY = "brandpulse.lang";

/** Native names, shown in the language switcher. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  az: "Azərbaycanca",
  ru: "Русский",
};

/** Two-letter codes shown in the nav chip. */
export const LANGUAGE_CODES: Record<Language, string> = {
  en: "EN",
  az: "AZ",
  ru: "RU",
};

/** BCP-47 locales handed to `Intl` — never hand-build numbers/dates. */
export const INTL_LOCALES: Record<Language, string> = {
  en: "en-US",
  az: "az-AZ",
  ru: "ru-RU",
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/** `ru-RU` / `ru` / `RU` → `ru`; anything unsupported → `null`. */
export function normalizeLanguage(value: string | null | undefined): Language | null {
  if (!value) return null;
  const base = value.toLowerCase().split("-")[0];
  return base !== undefined && isLanguage(base) ? base : null;
}

export function queryLanguage(search: string): Language | null {
  try {
    return normalizeLanguage(new URLSearchParams(search).get("lang"));
  } catch {
    return null;
  }
}

export function storedLanguage(): Language | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function browserLanguage(): Language | null {
  if (typeof navigator === "undefined") return null;
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const candidate of candidates) {
    const supported = normalizeLanguage(candidate);
    if (supported) return supported;
  }
  return null;
}

/**
 * Detection order: saved choice → `?lang=` → browser language → English.
 */
export function detectLanguage(search = typeof window === "undefined" ? "" : window.location.search): Language {
  return storedLanguage() ?? queryLanguage(search) ?? browserLanguage() ?? DEFAULT_LANGUAGE;
}

export function persistLanguage(language: Language): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* private mode / storage disabled — the choice simply is not persisted */
  }
}

/** Keeps `<html lang>` in sync so screen readers and font fallback follow the UI. */
export function syncDocumentLanguage(language: Language): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dir = "ltr";
}
