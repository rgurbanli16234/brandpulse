import type { AppResources } from "@/i18n/locale-types";

export type FeatureState = "available" | "soon";

export type PlanId = "demo" | "pro" | "business" | "enterprise";

/** Every piece of plan copy is a key under `pricing:plans.*`. */
export type PlanFeatureKey = keyof AppResources["pricing"]["plans"]["features"];
export type ComparisonGroupKey = keyof AppResources["pricing"]["comparison"]["groups"];
export type ComparisonRowKey = keyof AppResources["pricing"]["comparison"]["rows"];
export type ComparisonValueKey = keyof AppResources["pricing"]["comparison"]["values"];
export type FaqKey = keyof AppResources["pricing"]["faq"]["items"];

export type PlanFeature = {
  key: PlanFeatureKey;
  state: FeatureState;
};

export type Plan = {
  id: PlanId;
  /** Monthly price in USD, or null for "Custom". */
  priceMonthly: number | null;
  /** Effective monthly price when billed yearly (equals monthly when free). */
  priceYearly: number | null;
  highlighted?: boolean;
  features: PlanFeature[];
};

/**
 * Illustrative plans for the prototype. Prices are examples only — the app never
 * takes a payment. "soon" marks a feature that does not exist in the product yet.
 * Names, taglines and CTAs come from `pricing:plans.items.<id>`.
 */
export const PLANS: Plan[] = [
  {
    id: "demo",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      { key: "demoData", state: "available" },
      { key: "playground", state: "available" },
      { key: "manualImport", state: "available" },
      { key: "oneProject", state: "available" },
      { key: "dashboard", state: "available" },
      { key: "history7", state: "available" },
      { key: "inAppAlerts", state: "available" },
    ],
  },
  {
    id: "pro",
    priceMonthly: 19,
    priceYearly: 16,
    highlighted: true,
    features: [
      { key: "everythingDemo", state: "available" },
      { key: "rssSources", state: "available" },
      { key: "emailAlerts", state: "available" },
      { key: "history30", state: "available" },
      { key: "keywords5", state: "available" },
      { key: "threeLanguages", state: "available" },
      { key: "replyDrafts", state: "available" },
    ],
  },
  {
    id: "business",
    priceMonthly: 59,
    priceYearly: 49,
    features: [
      { key: "everythingPro", state: "available" },
      { key: "multiProject", state: "available" },
      { key: "webhookAlerts", state: "available" },
      { key: "unlimitedKeywords", state: "available" },
      { key: "priorityBreakdown", state: "available" },
      { key: "neuralMode", state: "available" },
      { key: "history12", state: "soon" },
      { key: "teamMembers", state: "soon" },
    ],
  },
  {
    id: "enterprise",
    priceMonthly: null,
    priceYearly: null,
    features: [
      { key: "everythingBusiness", state: "available" },
      { key: "customIntegrations", state: "soon" },
      { key: "sso", state: "soon" },
      { key: "dedicatedSupport", state: "soon" },
      { key: "modelTuning", state: "soon" },
      { key: "onPremise", state: "soon" },
      { key: "sla", state: "soon" },
    ],
  },
];

export const PLAN_ORDER = PLANS.map((plan) => plan.id);

/** Narrows a backend plan code (e.g. from a session) to a known plan. */
export function isPlanId(value: string): value is PlanId {
  return PLANS.some((plan) => plan.id === value);
}

export type ComparisonRow = {
  feature: ComparisonRowKey;
  /** One value key per column, in PLAN_ORDER order: Demo, Pro, Business, Enterprise. */
  values: [ComparisonValueKey, ComparisonValueKey, ComparisonValueKey, ComparisonValueKey];
  soon?: boolean;
};

export type ComparisonGroup = {
  group: ComparisonGroupKey;
  rows: ComparisonRow[];
};

export const COMPARISON: ComparisonGroup[] = [
  {
    group: "monitoring",
    rows: [
      { feature: "projects", values: ["one", "one", "multiple", "multiple"] },
      { feature: "manualImport", values: ["yes", "yes", "yes", "yes"] },
      { feature: "rssSources", values: ["none", "yes", "yes", "yes"] },
      { feature: "keywords", values: ["none", "upTo5", "unlimited", "unlimited"] },
      { feature: "languages", values: ["languages", "languages", "languages", "languages"] },
    ],
  },
  {
    group: "analysis",
    rows: [
      { feature: "detection", values: ["yes", "yes", "yes", "yes"] },
      { feature: "clustering", values: ["yes", "yes", "yes", "yes"] },
      { feature: "priorityScore", values: ["yes", "yes", "yes", "yes"] },
      { feature: "priorityBreakdown", values: ["none", "none", "yes", "yes"] },
      { feature: "neuralMode", values: ["none", "none", "yes", "yes"] },
    ],
  },
  {
    group: "alerts",
    rows: [
      { feature: "inAppAlerts", values: ["yes", "yes", "yes", "yes"] },
      { feature: "emailAlerts", values: ["none", "yes", "yes", "yes"] },
      { feature: "webhookAlerts", values: ["none", "none", "yes", "yes"] },
      { feature: "replyDrafts", values: ["none", "yes", "yes", "yes"] },
    ],
  },
  {
    group: "history",
    rows: [
      { feature: "history", values: ["days7", "days30", "months12", "custom"], soon: true },
      { feature: "teamMembers", values: ["none", "none", "none", "none"], soon: true },
      { feature: "sso", values: ["none", "none", "none", "none"], soon: true },
    ],
  },
  {
    group: "enterprise",
    rows: [
      { feature: "customIntegrations", values: ["none", "none", "none", "none"], soon: true },
      { feature: "modelTuning", values: ["none", "none", "none", "none"], soon: true },
      { feature: "onPremise", values: ["none", "none", "none", "none"], soon: true },
      { feature: "support", values: ["none", "none", "none", "none"], soon: true },
    ],
  },
];

/** Order of the FAQ accordion; the copy lives under `pricing:faq.items.*`. */
export const PRICING_FAQ: FaqKey[] = [
  "trial",
  "changePlans",
  "languages",
  "mentions",
  "data",
  "support",
];
