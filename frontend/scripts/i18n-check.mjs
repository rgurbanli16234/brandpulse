#!/usr/bin/env node
/**
 * `npm run i18n:check`
 *
 * Guards the three locale bundles (`en` is the source of truth) and the source
 * tree against drift:
 *
 *   a. key parity      — az/ru expose exactly the same keys as en (plurals compared by base)
 *   b. no empty values — every locale string has content
 *   c. no untranslated — az/ru never simply mirror the English value
 *   d. interpolation   — `{{variables}}` and plural categories match across languages
 *   e. no leftovers    — no hard-coded English in JSX/aria/placeholder/toast outside the allow-list
 *
 * Exits non-zero on the first failing check so CI and the local build gate stop.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const LOCALES_DIR = join(ROOT, "src", "locales");
const SRCS_DIR = join(ROOT, "src");

const LANGUAGES = ["en", "az", "ru"];
const SOURCE = "en";
const NAMESPACES = [
  "common",
  "nav",
  "landing",
  "pricing",
  "blog",
  "audiences",
  "auth",
  "app",
  "errors",
];
const INTL_LOCALES = { en: "en-US", az: "az-AZ", ru: "ru-RU" };

const PLURAL_SUFFIXES = ["zero", "one", "two", "few", "many", "other"];

/**
 * Values that may legitimately be identical across languages: brand names,
 * sample data and code/product values that must not be translated.
 */
const IDENTICAL_ALLOWED = new Set([
  "ANALYZER",
  "BrandPulse",
  "Reddit",
  "RSS",
  "Webhook URL",
  "csv",
  "rules",
  "2.0x",
  "60 min",
]);

/** Exact `ns:key` pairs that are allowed to match English, with the reason. */
const IDENTICAL_ALLOWED_KEYS = new Map([
  // Plan names are product names — they stay in English in every language.
  ["pricing:plans.items.demo.name", "plan name (product name)"],
  ["pricing:plans.items.pro.name", "plan name (product name)"],
  ["pricing:plans.items.business.name", "plan name (product name)"],
  ["pricing:plans.items.enterprise.name", "plan name (product name)"],
  // Language codes are not translated.
  ["pricing:comparison.values.languages", "language codes (EN / AZ / RU)"],
  // Loanwords that are already the natural spelling in Azerbaijani.
  ["landing:mockup.demoBadge", "Azerbaijani spells the loanword exactly like English"],
  ["app:threads.statusPlaceholder", "Azerbaijani spells the loanword exactly like English"],
  ["app:thread.status.title", "Azerbaijani spells the loanword exactly like English"],
  ["audiences:hotels.topics.transfer", "“Transfer” is the standard Azerbaijani term"],
  ["common:language.names.en", "native language name"],
  ["common:enums.mentionLanguage.EN", "native language name"],
  ["auth:login.placeholders.email", "example email address"],
  ["auth:login.placeholders.password", "bullet placeholder"],
  ["auth:login.placeholders.alertEmail", "example email address"],
  ["auth:login.placeholders.businessName", "sample business name"],
  ["app:mentions.add.authorPlaceholder", "example @handle"],
  ["app:settings.keywords.placeholder", "example keyword (brand)"],
  ["app:settings.sources.feedSummary_one", "count + state only"],
  ["app:settings.sources.feedSummary_few", "count + state only"],
  ["app:settings.sources.feedSummary_many", "count + state only"],
  ["app:settings.sources.feedSummary_other", "count + state only"],
  ["common:counts.mentions_other", "identical plural string by design"],
  ["common:counts.complaints_other", "identical plural string by design"],
  ["common:counts.alerts_other", "identical plural string by design"],
  ["common:counts.threads_other", "identical plural string by design"],
  ["common:counts.feeds_other", "identical plural string by design"],
  ["common:counts.reports_other", "identical plural string by design"],
]);

/* ------------------------------------------------------------------ helpers */

function flatten(value, prefix, out) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}.${index}`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return;
  }
  out[prefix] = value;
}

function pluralOf(key) {
  const match = /^(.*)_(zero|one|two|few|many|other)$/.exec(key);
  return match ? { base: match[1], category: match[2] } : null;
}

function baseKey(key) {
  const plural = pluralOf(key);
  return plural ? plural.base : key;
}

function variablesOf(value) {
  const found = new Set();
  for (const match of String(value).matchAll(/\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g)) {
    found.add(match[1]);
  }
  return found;
}

function hasLetters(value) {
  return /[A-Za-zÀ-ÿĀ-žА-яЀ-ӿ]/.test(String(value));
}

/**
 * Letters that actually need translating: interpolation placeholders and the
 * allow-listed brand/product tokens are stripped first, so a template that is
 * nothing but `{{summary}}` is not mistaken for untranslated copy.
 */
function hasResidualLetters(value) {
  let text = String(value).replace(/\{\{[^}]*\}\}/g, " ");
  for (const allowed of IDENTICAL_ALLOWED) text = text.split(allowed).join(" ");
  return hasLetters(text);
}

function walk(dir, filter, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, filter, out);
    else if (filter(full)) out.push(full);
  }
  return out;
}

/** `{ lang: { "ns:key": value } }` plus plural bookkeeping. */
function loadLocales() {
  const data = {};
  for (const language of LANGUAGES) {
    const flat = {};
    data[language] = flat;
    for (const namespace of NAMESPACES) {
      const raw = JSON.parse(readFileSync(join(LOCALES_DIR, language, `${namespace}.json`), "utf8"));
      const entries = {};
      flatten(raw, "", entries);
      for (const [key, value] of Object.entries(entries)) {
        flat[`${namespace}:${key}`] = value;
      }
    }
  }
  return data;
}

/* ------------------------------------------------------------------- checks */

const problems = [];
const fail = (section, message) => problems.push({ section, message });

function checkKeyParity(locales) {
  const sourceKeys = new Set(Object.keys(locales[SOURCE]).map(baseKey));
  let reported = 0;

  for (const language of LANGUAGES) {
    if (language === SOURCE) continue;
    const targetKeys = new Set(Object.keys(locales[language]).map(baseKey));
    const missing = [...sourceKeys].filter((key) => !targetKeys.has(key));
    const extra = [...targetKeys].filter((key) => !sourceKeys.has(key));
    for (const key of missing) fail("a) key parity", `${language}: missing ${key}`);
    for (const key of extra) fail("a) key parity", `${language}: unexpected ${key}`);
    reported += missing.length + extra.length;
  }
  return reported;
}

function checkEmptyValues(locales) {
  let reported = 0;
  for (const language of LANGUAGES) {
    for (const [key, value] of Object.entries(locales[language])) {
      if (typeof value === "number" || typeof value === "boolean") continue;
      if (typeof value !== "string" || value.trim().length === 0) {
        fail("b) empty values", `${language}: ${key} is empty`);
        reported += 1;
      }
    }
  }
  return reported;
}

function checkUntranslated(locales) {
  let reported = 0;
  for (const language of LANGUAGES) {
    if (language === SOURCE) continue;
    for (const [key, value] of Object.entries(locales[language])) {
      const english = locales[SOURCE][key];
      if (typeof english !== "string" || english !== value) continue;
      if (IDENTICAL_ALLOWED.has(value) || !hasResidualLetters(value)) continue;
      const namespace = key.split(":")[0];
      if (IDENTICAL_ALLOWED_KEYS.has(`${namespace}:${key.split(":").slice(1).join(":")}`)) continue;
      fail("c) untranslated", `${language}: ${key} still reads "${value}"`);
      reported += 1;
    }
  }
  return reported;
}

function checkPlurals(locales) {
  let reported = 0;
  for (const language of LANGUAGES) {
    const bases = new Map();
    for (const key of Object.keys(locales[language])) {
      const plural = pluralOf(key);
      if (!plural) continue;
      const set = bases.get(plural.base) ?? new Set();
      set.add(plural.category);
      bases.set(plural.base, set);
    }
    const required = new Intl.PluralRules(INTL_LOCALES[language]).resolvedOptions().pluralCategories;
    for (const [base, categories] of bases) {
      for (const category of required) {
        if (!categories.has(category)) {
          fail("d) plurals", `${language}: ${base} is missing the "${category}" plural form`);
          reported += 1;
        }
      }
    }
  }
  return reported;
}

function checkInterpolation(locales) {
  const sourceBases = new Map();
  for (const [key, value] of Object.entries(locales[SOURCE])) {
    const base = baseKey(key);
    const set = sourceBases.get(base) ?? new Set();
    for (const name of variablesOf(value)) set.add(name);
    sourceBases.set(base, set);
  }

  const targetBases = (language) => {
    const map = new Map();
    for (const [key, value] of Object.entries(locales[language])) {
      const base = baseKey(key);
      const set = map.get(base) ?? new Set();
      for (const name of variablesOf(value)) set.add(name);
      map.set(base, set);
    }
    return map;
  };

  let reported = 0;
  for (const language of LANGUAGES) {
    if (language === SOURCE) continue;
    const map = targetBases(language);
    for (const [base, names] of sourceBases) {
      const target = map.get(base);
      if (!target) continue; // missing keys are already reported by (a)
      const sortedSource = [...names].sort().join(", ") || "—";
      const sortedTarget = [...target].sort().join(", ") || "—";
      if (sortedSource !== sortedTarget) {
        fail(
          "d) interpolation",
          `${language}: ${base} uses {${sortedTarget}} but en uses {${sortedSource}}`,
        );
        reported += 1;
      }
    }
  }
  return reported;
}

/* ---------------------------------------------------- hard-coded English scan */

const SCAN_SKIP = [
  `${join("src", "locales")}`,
  `${join("src", "i18n")}`,
  `${join("src", "routeTree.gen.ts")}`,
  `${join("src", "components", "ui")}`,
];

/** Files whose contents are not user-facing app copy (server fallbacks, data). */
const SCAN_ALLOWED_FILES = new Map([
  [
    join("src", "lib", "error-page.ts"),
    "server-side last-resort HTML: rendered when the app itself failed to boot, so no i18n runtime exists",
  ],
]);

const SCAN_PATTERNS = [
  // The trailing `</` keeps TypeScript generics such as `Promise<void>` out.
  { label: "jsx text", regex: />\s*[A-Za-z][A-Za-z ,.'’\-]{5,}\s*<\//g },
  { label: "aria/placeholder/alt", regex: /(?:aria-label|placeholder|alt|title)="[A-Za-z][^"]*"/g },
  { label: "toast literal", regex: /toast\.(?:success|error|info|warning)\(\s*"[^"]/g },
  { label: "api error literal", regex: /new ApiError\(\s*[\w.]+\s*,\s*"[^"]/g },
];

function isAllowedSnippet(snippet) {
  const value = snippet.replace(/^[^"]*"/, "").replace(/"$/, "");
  if (value.startsWith("http")) return true;
  if (/^[\w.+-]+@[\w.-]+$/.test(value)) return true;
  if (!hasLetters(value)) return true;
  for (const allowed of IDENTICAL_ALLOWED) {
    if (value.includes(allowed)) return true;
  }
  return false;
}

function checkHardCodedEnglish() {
  const files = walk(SRCS_DIR, (file) => /\.(tsx|ts)$/.test(file));
  let reported = 0;

  for (const file of files) {
    const rel = relative(ROOT, file);
    if (SCAN_SKIP.some((skip) => rel.startsWith(skip))) continue;
    if (SCAN_ALLOWED_FILES.has(rel)) continue;

    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const { label, regex } of SCAN_PATTERNS) {
        regex.lastIndex = 0;
        for (const match of line.matchAll(regex)) {
          const snippet = match[0].trim();
          if (isAllowedSnippet(snippet)) continue;
          fail("e) hard-coded English", `${rel}:${index + 1} (${label}) ${snippet}`);
          reported += 1;
        }
      }
    });
  }
  return reported;
}

/* -------------------------------------------------------------------- report */

const locales = loadLocales();
const counts = [
  ["a) key parity", checkKeyParity(locales)],
  ["b) empty values", checkEmptyValues(locales)],
  ["c) untranslated", checkUntranslated(locales)],
  ["d) plurals", checkPlurals(locales)],
  ["d) interpolation", checkInterpolation(locales)],
  ["e) hard-coded English", checkHardCodedEnglish()],
];

const keysPerLanguage = Object.fromEntries(
  LANGUAGES.map((language) => [language, Object.keys(locales[language]).length]),
);

console.log("i18n check\n");
console.log(
  `locale keys  en=${keysPerLanguage.en}  az=${keysPerLanguage.az}  ru=${keysPerLanguage.ru}`,
);
for (const [section, count] of counts) {
  console.log(`${count === 0 ? "PASS" : "FAIL"}  ${section}${count ? ` (${count})` : ""}`);
}

if (problems.length > 0) {
  console.log("");
  const grouped = new Map();
  for (const { section, message } of problems) {
    const list = grouped.get(section) ?? [];
    list.push(message);
    grouped.set(section, list);
  }
  for (const [section, messages] of grouped) {
    console.log(`${section}:`);
    for (const message of messages.slice(0, 40)) console.log(`  - ${message}`);
    if (messages.length > 40) console.log(`  … and ${messages.length - 40} more`);
    console.log("");
  }
  process.exit(1);
}

console.log("\nAll checks passed.");
