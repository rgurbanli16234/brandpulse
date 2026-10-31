export type FeatureState = "available" | "soon";

export type PlanFeature = {
  label: string;
  state: FeatureState;
};

export type Plan = {
  id: "demo" | "pro" | "business" | "enterprise";
  name: string;
  /** Monthly price in USD, or null for "Custom". */
  priceMonthly: number | null;
  /** Effective monthly price when billed yearly (equals monthly when free). */
  priceYearly: number | null;
  tagline: string;
  highlighted?: boolean;
  ctaLabel: string;
  features: PlanFeature[];
};

/**
 * Illustrative plans for the prototype. Prices are examples only — the app never
 * takes a payment. "soon" marks a feature that does not exist in the product yet.
 */
export const PLANS: Plan[] = [
  {
    id: "demo",
    name: "Demo",
    priceMonthly: 0,
    priceYearly: 0,
    tagline: "Everything you need to try BrandPulse on sample data.",
    ctaLabel: "Start free",
    features: [
      { label: "Built-in demo data", state: "available" },
      { label: "Analyze playground", state: "available" },
      { label: "Manual paste and CSV import", state: "available" },
      { label: "1 project", state: "available" },
      { label: "Dashboard, mentions and threads", state: "available" },
      { label: "7-day history", state: "available" },
      { label: "In-app alerts", state: "available" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    priceYearly: 16,
    tagline: "For a single business that monitors every day.",
    highlighted: true,
    ctaLabel: "Start 14-day trial",
    features: [
      { label: "Everything in Demo", state: "available" },
      { label: "RSS sources", state: "available" },
      { label: "Email alerts", state: "available" },
      { label: "30-day history", state: "available" },
      { label: "Up to 5 tracked keywords", state: "available" },
      { label: "English, Azerbaijani and Russian", state: "available" },
      { label: "Suggested reply drafts", state: "available" },
    ],
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 59,
    priceYearly: 49,
    tagline: "For companies running several brands or locations.",
    ctaLabel: "Start 14-day trial",
    features: [
      { label: "Everything in Pro", state: "available" },
      { label: "Multiple projects", state: "available" },
      { label: "Webhook alerts (Telegram / Slack-ready)", state: "available" },
      { label: "Unlimited keywords", state: "available" },
      { label: "Priority score breakdown", state: "available" },
      { label: "Optional neural sentiment mode", state: "available" },
      { label: "12-month history", state: "soon" },
      { label: "Team members", state: "soon" },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: null,
    priceYearly: null,
    tagline: "For organisations with their own integration and privacy rules.",
    ctaLabel: "Talk to us",
    features: [
      { label: "Everything in Business", state: "available" },
      { label: "Custom integrations", state: "soon" },
      { label: "Single sign-on (SSO)", state: "soon" },
      { label: "Dedicated support", state: "soon" },
      { label: "Custom model tuning", state: "soon" },
      { label: "On-premise deployment", state: "soon" },
      { label: "Service level agreement", state: "soon" },
    ],
  },
];

export const PLAN_ORDER = PLANS.map((plan) => plan.id);

export type ComparisonRow = {
  feature: string;
  values: [string, string, string, string];
  soon?: boolean;
};

export type ComparisonGroup = {
  group: string;
  rows: ComparisonRow[];
};

/** Four columns, in PLAN_ORDER order: Demo, Pro, Business, Enterprise. */
export const COMPARISON: ComparisonGroup[] = [
  {
    group: "Monitoring",
    rows: [
      { feature: "Projects", values: ["1", "1", "Multiple", "Multiple"] },
      { feature: "CSV import and manual paste", values: ["Yes", "Yes", "Yes", "Yes"] },
      { feature: "RSS sources", values: ["—", "Yes", "Yes", "Yes"] },
      { feature: "Tracked keywords", values: ["—", "Up to 5", "Unlimited", "Unlimited"] },
      { feature: "Languages", values: ["EN / AZ / RU", "EN / AZ / RU", "EN / AZ / RU", "EN / AZ / RU"] },
    ],
  },
  {
    group: "Analysis",
    rows: [
      { feature: "Sentiment and complaint detection", values: ["Yes", "Yes", "Yes", "Yes"] },
      { feature: "Incident clustering", values: ["Yes", "Yes", "Yes", "Yes"] },
      { feature: "Priority score", values: ["Yes", "Yes", "Yes", "Yes"] },
      { feature: "Priority score breakdown", values: ["—", "—", "Yes", "Yes"] },
      { feature: "Neural sentiment mode (optional)", values: ["—", "—", "Yes", "Yes"] },
    ],
  },
  {
    group: "Alerts and replies",
    rows: [
      { feature: "In-app alerts", values: ["Yes", "Yes", "Yes", "Yes"] },
      { feature: "Email alerts", values: ["—", "Yes", "Yes", "Yes"] },
      { feature: "Webhook alerts (Telegram / Slack-ready)", values: ["—", "—", "Yes", "Yes"] },
      { feature: "Suggested reply drafts", values: ["—", "Yes", "Yes", "Yes"] },
    ],
  },
  {
    group: "History and access",
    rows: [
      { feature: "History", values: ["7 days", "30 days", "12 months", "Custom"], soon: true },
      { feature: "Team members", values: ["—", "—", "—", "—"], soon: true },
      { feature: "Single sign-on (SSO)", values: ["—", "—", "—", "—"], soon: true },
    ],
  },
  {
    group: "Enterprise add-ons",
    rows: [
      { feature: "Custom integrations", values: ["—", "—", "—", "—"], soon: true },
      { feature: "Custom model tuning", values: ["—", "—", "—", "—"], soon: true },
      { feature: "On-premise deployment", values: ["—", "—", "—", "—"], soon: true },
      { feature: "Dedicated support and SLA", values: ["—", "—", "—", "—"], soon: true },
    ],
  },
];

export type FaqItem = { question: string; answer: string };

export const PRICING_FAQ: FaqItem[] = [
  {
    question: "Is there a trial?",
    answer:
      "The prototype is free to use with your own demo data — there is no payment step anywhere in the app. The paid plans above are illustrative and show what a production version would include.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "In a production version, yes — you would move between Demo, Pro and Business at any time and the change would apply at the next billing period. In this prototype nothing is billed, so there is nothing to change.",
  },
  {
    question: "Which languages are supported?",
    answer:
      "English, Azerbaijani and Russian are supported today for sentiment, complaint detection and topic labels. The interface itself is in English, and Azerbaijani-speaking support would be available on the Business and Enterprise plans.",
  },
  {
    question: "Where do the mentions come from?",
    answer:
      "From what you give BrandPulse: CSV uploads, text you paste into the playground, and RSS feeds. BrandPulse does not scrape or log into social networks, so there is no X, Instagram or Facebook monitoring in this version.",
  },
  {
    question: "What happens to my data?",
    answer:
      "Everything runs in your own deployment and mentions are stored in that deployment's database. Nothing is sent to a third-party analytics or AI service unless you explicitly configure an optional LLM key.",
  },
  {
    question: "Do you offer support in Azerbaijani?",
    answer:
      "Yes — Azerbaijani-language support is planned for the paid tiers, alongside English. In the prototype, the documentation in the repository is the main reference.",
  },
];
