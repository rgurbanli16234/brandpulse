/**
 * Backend enum values → translation keys.
 *
 * The backend values (`strongly_negative`, `Low`, `Billing/Payment`, …) are part
 * of the API contract and are never translated or changed. The UI only ever
 * renders the translated label for them, so every mapping lives here.
 *
 * The key maps are literal objects on purpose: i18next's typed `t()` checks them
 * at compile time, so a renamed locale key fails `tsc`.
 */

export const SENTIMENT_KEYS = {
  strongly_negative: "enums.sentiment.strongly_negative",
  negative: "enums.sentiment.negative",
  neutral: "enums.sentiment.neutral",
  positive: "enums.sentiment.positive",
} as const;

export const PRIORITY_KEYS = {
  Low: "enums.priority.Low",
  Medium: "enums.priority.Medium",
  High: "enums.priority.High",
  Critical: "enums.priority.Critical",
} as const;

export const THREAD_STATUS_KEYS = {
  open: "enums.threadStatus.open",
  investigating: "enums.threadStatus.investigating",
  resolved: "enums.threadStatus.resolved",
} as const;

export const SOURCE_KEYS = {
  csv: "enums.source.csv",
  manual: "enums.source.manual",
  reddit: "enums.source.reddit",
  rss: "enums.source.rss",
  demo: "enums.source.demo",
} as const;

export const KEYWORD_TYPE_KEYS = {
  brand: "enums.keywordType.brand",
  product: "enums.keywordType.product",
  executive: "enums.keywordType.executive",
  typo: "enums.keywordType.typo",
  competitor: "enums.keywordType.competitor",
} as const;

export const MENTION_LANGUAGE_KEYS = {
  EN: "enums.mentionLanguage.EN",
  AZ: "enums.mentionLanguage.AZ",
  RU: "enums.mentionLanguage.RU",
} as const;

/** The translated label keys for the analyser's topic values. */
export type TopicKey =
  | "enums.topic.billing_payment"
  | "enums.topic.product_quality"
  | "enums.topic.customer_service"
  | "enums.topic.delivery_shipping"
  | "enums.topic.website_app_bug"
  | "enums.topic.price"
  | "enums.topic.staff_behavior"
  | "enums.topic.other";

/**
 * The analyser emits topics with slashes ("Billing/Payment", "Delivery/Shipping");
 * locale keys use underscores. Anything unknown returns `null` so the caller can
 * fall back to the raw value instead of showing a broken key.
 */
const TOPIC_KEYS: Record<string, TopicKey> = {
  "Billing/Payment": "enums.topic.billing_payment",
  "Product Quality": "enums.topic.product_quality",
  "Customer Service": "enums.topic.customer_service",
  "Delivery/Shipping": "enums.topic.delivery_shipping",
  "Website/App Bug": "enums.topic.website_app_bug",
  Price: "enums.topic.price",
  "Staff Behavior": "enums.topic.staff_behavior",
  Other: "enums.topic.other",
};

/** `"Delivery / Shipping"` and `"delivery/shipping"` collapse to the canonical value. */
function canonicalTopic(value: string): string | null {
  const normalized = value.trim().replace(/\s*\/\s*/g, "/");
  const direct = Object.keys(TOPIC_KEYS).find(
    (topic) => topic.toLowerCase() === normalized.toLowerCase(),
  );
  return direct ?? null;
}

export function topicKey(value: string | null | undefined): TopicKey | null {
  if (!value) return null;
  const topic = canonicalTopic(value);
  return topic ? (TOPIC_KEYS[topic] ?? null) : null;
}
