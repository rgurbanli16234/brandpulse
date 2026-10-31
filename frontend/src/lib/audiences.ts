import {
  BedDouble,
  Briefcase,
  Coffee,
  ShoppingBag,
  Stethoscope,
  Truck,
  type LucideIcon,
} from "lucide-react";

import type { AppResources } from "@/i18n/locale-types";
import type { PriorityTier, SentimentLabel } from "@/lib/api";

export type AudienceSlug = keyof Omit<AppResources["audiences"], "page">;

export type AudienceComplaint = {
  /** Realistic sample text, shown in the language it was written in. */
  text: string;
  lang: "EN" | "AZ" | "RU";
  sentiment: SentimentLabel;
  /** Fully-qualified key for the topic chip, e.g. `audiences:cafes.topics.service`. */
  topicKey: AudienceTopicLabelKey;
};

/** Every `audiences:<slug>.topics.*` label that the sample complaints can use. */
export type AudienceTopicLabelKey = {
  [S in AudienceSlug]: `audiences:${S}.topics.${keyof AppResources["audiences"][S]["topics"] & string}`;
}[AudienceSlug];

export type Audience = {
  slug: AudienceSlug;
  icon: LucideIcon;
  /** Priority tier of the example alert shown on the page. */
  alertPriority: Exclude<PriorityTier, "Low">;
  complaints: AudienceComplaint[];
};

/** Fully-qualified locale keys for the shared audience labels. */
export type AudienceLabelKey = `audiences:${AudienceSlug}.menuLabel`;
export type AudienceShortKey = `audiences:${AudienceSlug}.short`;

/**
 * The stable part of each audience landing page. Headlines, intros, help copy,
 * alert copy and the topic labels live under `audiences:<slug>` in the locale
 * files; the sample complaints below stay in the language they were written in.
 * No real customer names, logos or statistics.
 */
export const AUDIENCES: Audience[] = [
  {
    slug: "cafes",
    icon: Coffee,
    alertPriority: "High",
    complaints: [
      {
        text: "Waited 25 minutes for two coffees and the order still came out wrong.",
        lang: "EN",
        sentiment: "negative",
        topicKey: "audiences:cafes.topics.service",
      },
      {
        text: "The pastry tasted stale and the tables were not wiped between guests.",
        lang: "EN",
        sentiment: "negative",
        topicKey: "audiences:cafes.topics.productQuality",
      },
      {
        text: "Ofisiant bizi 20 dəqiqə gözlətdi, sonra sifarişi səhv gətirdi.",
        lang: "AZ",
        sentiment: "negative",
        topicKey: "audiences:cafes.topics.service",
      },
      {
        text: "Qəhvə soyuq idi, qiymətinə görə bunu gözləmirdim.",
        lang: "AZ",
        sentiment: "negative",
        topicKey: "audiences:cafes.topics.productQuality",
      },
      {
        text: "Заказали завтрак, принесли холодным, а официант нагрубил.",
        lang: "RU",
        sentiment: "strongly_negative",
        topicKey: "audiences:cafes.topics.staffConduct",
      },
    ],
  },
  {
    slug: "online-shops",
    icon: ShoppingBag,
    alertPriority: "Critical",
    complaints: [
      {
        text: "Ordered size M and received something that fits like a small. The return page does not work.",
        lang: "EN",
        sentiment: "negative",
        topicKey: "audiences:online-shops.topics.returns",
      },
      {
        text: "The item arrived scratched and nobody has answered my support emails.",
        lang: "EN",
        sentiment: "strongly_negative",
        topicKey: "audiences:online-shops.topics.support",
      },
      {
        text: "Sifariş 10 gündür gəlmir və heç kim zəng etmir.",
        lang: "AZ",
        sentiment: "negative",
        topicKey: "audiences:online-shops.topics.delivery",
      },
      {
        text: "Saytda göstərilən rəng gələn məhsuldan tamamilə fərqlidir.",
        lang: "AZ",
        sentiment: "negative",
        topicKey: "audiences:online-shops.topics.productQuality",
      },
      {
        text: "Вернул товар две недели назад, деньги до сих пор не вернули.",
        lang: "RU",
        sentiment: "strongly_negative",
        topicKey: "audiences:online-shops.topics.refunds",
      },
    ],
  },
  {
    slug: "delivery",
    icon: Truck,
    alertPriority: "High",
    complaints: [
      {
        text: "Tracking says delivered, but nothing arrived and support cannot find my parcel.",
        lang: "EN",
        sentiment: "strongly_negative",
        topicKey: "audiences:delivery.topics.lostParcel",
      },
      {
        text: "The courier left the box outside in the rain without calling me.",
        lang: "EN",
        sentiment: "negative",
        topicKey: "audiences:delivery.topics.courier",
      },
      {
        text: "45 dəqiqə deyilən çatdırılma 3 saat çəkdi.",
        lang: "AZ",
        sentiment: "negative",
        topicKey: "audiences:delivery.topics.lateDelivery",
      },
      {
        text: "Sifarişi qonşuya veriblər və mənə heç bir mesaj gəlmədi.",
        lang: "AZ",
        sentiment: "negative",
        topicKey: "audiences:delivery.topics.courier",
      },
      {
        text: "Курьер не позвонил и оставил заказ у подъезда.",
        lang: "RU",
        sentiment: "negative",
        topicKey: "audiences:delivery.topics.courier",
      },
    ],
  },
  {
    slug: "clinics",
    icon: Stethoscope,
    alertPriority: "High",
    complaints: [
      {
        text: "Called three times to reschedule and nobody picked up.",
        lang: "EN",
        sentiment: "negative",
        topicKey: "audiences:clinics.topics.reception",
      },
      {
        text: "I was billed for a treatment I never received.",
        lang: "EN",
        sentiment: "strongly_negative",
        topicKey: "audiences:clinics.topics.billing",
      },
      {
        text: "Randevu vaxtı 40 dəqiqə gecikdi və heç kim üzr istəmədi.",
        lang: "AZ",
        sentiment: "negative",
        topicKey: "audiences:clinics.topics.waitTime",
      },
      {
        text: "Qəbuldan sonra izahat vermədilər, qiyməti yalnız kassada öyrəndim.",
        lang: "AZ",
        sentiment: "negative",
        topicKey: "audiences:clinics.topics.pricing",
      },
      {
        text: "Записали не на ту процедуру и не предложили перезаписаться.",
        lang: "RU",
        sentiment: "negative",
        topicKey: "audiences:clinics.topics.booking",
      },
    ],
  },
  {
    slug: "hotels",
    icon: BedDouble,
    alertPriority: "High",
    complaints: [
      {
        text: "The room was not cleaned during our stay and the air conditioning did not work.",
        lang: "EN",
        sentiment: "strongly_negative",
        topicKey: "audiences:hotels.topics.roomCondition",
      },
      {
        text: "The booking said sea view; we got a wall and the car park.",
        lang: "EN",
        sentiment: "negative",
        topicKey: "audiences:hotels.topics.expectationMismatch",
      },
      {
        text: "Qeydiyyatda otaq hazır deyildi, iki saat gözlədik.",
        lang: "AZ",
        sentiment: "negative",
        topicKey: "audiences:hotels.topics.checkIn",
      },
      {
        text: "Səhər yeməyi elan olunmadan bitdi.",
        lang: "AZ",
        sentiment: "negative",
        topicKey: "audiences:hotels.topics.breakfast",
      },
      {
        text: "Обещали трансфер из аэропорта, но никто не приехал.",
        lang: "RU",
        sentiment: "strongly_negative",
        topicKey: "audiences:hotels.topics.transfer",
      },
    ],
  },
  {
    slug: "agencies",
    icon: Briefcase,
    alertPriority: "Medium",
    complaints: [
      {
        text: "We asked for one small change and it took the agency a whole week.",
        lang: "EN",
        sentiment: "negative",
        topicKey: "audiences:agencies.topics.responsiveness",
      },
      {
        text: "The monthly report had the wrong numbers for our campaign.",
        lang: "EN",
        sentiment: "negative",
        topicKey: "audiences:agencies.topics.reporting",
      },
      {
        text: "Layihə üçün yeni təklif vermədilər, eyni şablonu təkrarladılar.",
        lang: "AZ",
        sentiment: "negative",
        topicKey: "audiences:agencies.topics.creativity",
      },
      {
        text: "Hesabatda büdcə səhv göstərilib.",
        lang: "AZ",
        sentiment: "negative",
        topicKey: "audiences:agencies.topics.reporting",
      },
      {
        text: "Ответ на письмо ждали четыре дня, дедлайн сорвали.",
        lang: "RU",
        sentiment: "negative",
        topicKey: "audiences:agencies.topics.deadlines",
      },
    ],
  },
];

export function getAudience(slug: string): Audience | undefined {
  return AUDIENCES.find((audience) => audience.slug === slug);
}

/** Narrows a raw route param to one of the known industry slugs. */
export function isAudienceSlug(value: string): value is AudienceSlug {
  return AUDIENCES.some((audience) => audience.slug === value);
}
