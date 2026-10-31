/**
 * i18next runtime for BrandPulse.
 *
 * Only the active language (plus English as the fallback) is downloaded, and every
 * namespace arrives as its own lazy chunk, so the bundle stays small. `ensureI18n()`
 * is awaited once in the root component before the app renders, which avoids a flash
 * of raw translation keys.
 */

import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import {
  DEFAULT_LANGUAGE,
  NAMESPACES,
  detectLanguage,
  normalizeLanguage,
  persistLanguage,
  syncDocumentLanguage,
  type Language,
  type Namespace,
} from "./config";

type Bundle = Record<string, unknown>;

/** Vite turns this template literal into one lazy chunk per locale file. */
async function importNamespace(language: Language, namespace: Namespace): Promise<Bundle> {
  const module = (await import(`../locales/${language}/${namespace}.json`)) as { default: Bundle };
  return module.default;
}

const loaded = new Set<string>();

async function loadInto(
  instance: I18nInstance,
  language: Language,
  namespace: Namespace,
): Promise<void> {
  const key = `${language}:${namespace}`;
  if (loaded.has(key)) return;
  const bundle = await importNamespace(language, namespace);
  instance.addResourceBundle(language, namespace, bundle, true, true);
  loaded.add(key);
}

async function loadLanguage(instance: I18nInstance, language: Language): Promise<void> {
  await Promise.all(NAMESPACES.map((namespace) => loadInto(instance, language, namespace)));
}

export const i18n = i18next.createInstance();

let ready: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const initial = detectLanguage();

  // English is always loaded: it is the fallback for any key a translation misses.
  const needed: Language[] =
    initial === DEFAULT_LANGUAGE ? [DEFAULT_LANGUAGE] : [initial, DEFAULT_LANGUAGE];

  const resources: Record<string, Record<string, Bundle>> = {};
  await Promise.all(
    needed.map(async (language) => {
      const entries = await Promise.all(
        NAMESPACES.map(async (namespace) => {
          const bundle = await importNamespace(language, namespace);
          loaded.add(`${language}:${namespace}`);
          return [namespace, bundle] as const;
        }),
      );
      resources[language] = Object.fromEntries(entries);
    }),
  );

  await i18n.use(initReactI18next).init({
    lng: initial,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: "common",
    ns: [...NAMESPACES],
    resources,
    interpolation: {
      escapeValue: false,
      // i18next's built-in `number` formatter already routes `{{value, number}}`
      // through `Intl.NumberFormat(lng)`, so figures inside sentences follow the
      // locale just like `@/i18n/format` does elsewhere.
    },
    returnNull: false,
    react: { useSuspense: false },
  });

  i18n.on("languageChanged", (language) => {
    syncDocumentLanguage(normalizeLanguage(language) ?? DEFAULT_LANGUAGE);
  });
  syncDocumentLanguage(initial);
}

/** Resolves once the first language is usable. Safe to call many times. */
export function ensureI18n(): Promise<void> {
  ready ??= bootstrap();
  return ready;
}

/**
 * Switches language without a page reload and without touching the route or the
 * scroll position: the missing chunks are downloaded first, then the UI re-renders.
 */
export async function setLanguage(language: Language): Promise<void> {
  await ensureI18n();
  persistLanguage(language);
  if (normalizeLanguage(i18n.resolvedLanguage) === language) return;
  await loadLanguage(i18n, language);
  await i18n.changeLanguage(language);
}
