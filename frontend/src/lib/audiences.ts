import {
  BedDouble,
  Briefcase,
  Coffee,
  ShoppingBag,
  Stethoscope,
  Truck,
  type LucideIcon,
} from "lucide-react";

import type { SentimentLabel } from "@/lib/api";

export type AudienceComplaint = {
  text: string;
  lang: "EN" | "AZ" | "RU";
  sentiment: SentimentLabel;
  topic: string;
};

export type Audience = {
  slug: string;
  /** Label used in the Product menu. */
  menuLabel: string;
  /** Plural label used in the "Use cases" preview. */
  short: string;
  icon: LucideIcon;
  headline: string;
  intro: string;
  complaints: AudienceComplaint[];
  help: { title: string; text: string }[];
  alert: {
    priority: "Critical" | "High" | "Medium";
    title: string;
    detail: string;
    reply: string;
  };
};

/**
 * One entry per audience landing page. Copy is written for BrandPulse and is
 * intentionally generic — no real customer names, logos or statistics.
 */
export const AUDIENCES: Audience[] = [
  {
    slug: "cafes",
    menuLabel: "For Cafes & Restaurants",
    short: "Cafes & Restaurants",
    icon: Coffee,
    headline: "Know which table walked out unhappy",
    intro:
      "A cafe lives on repeat visits, so a slow order or a cold flat white costs more than one sale. Most of that feedback arrives in reviews and messages you only see days later. BrandPulse pulls it together and tells you what actually needs a reply today.",
    complaints: [
      {
        text: "Waited 25 minutes for two coffees and the order still came out wrong.",
        lang: "EN",
        sentiment: "negative",
        topic: "Service",
      },
      {
        text: "The pastry tasted stale and the tables were not wiped between guests.",
        lang: "EN",
        sentiment: "negative",
        topic: "Product quality",
      },
      {
        text: "Ofisiant bizi 20 dəqiqə gözlətdi, sonra sifarişi səhv gətirdi.",
        lang: "AZ",
        sentiment: "negative",
        topic: "Service",
      },
      {
        text: "Qəhvə soyuq idi, qiymətinə görə bunu gözləmirdim.",
        lang: "AZ",
        sentiment: "negative",
        topic: "Product quality",
      },
      {
        text: "Заказали завтрак, принесли холодным, а официант нагрубил.",
        lang: "RU",
        sentiment: "strongly_negative",
        topic: "Staff conduct",
      },
    ],
    help: [
      {
        title: "Detect the complaints",
        text: "Angry reviews and messages are scored for sentiment and flagged as complaints, while a simple “the latte was great” is left alone.",
      },
      {
        title: "Group them into incident threads",
        text: "Ten mentions about the same slow weekend collapse into one incident instead of ten notifications.",
      },
      {
        title: "Alert with a priority score",
        text: "A repeat complaint from a regular customer rises above a one-off grumble, so your shift lead sees it first.",
      },
    ],
    alert: {
      priority: "High",
      title: "6 mentions about slow service at the Nizami branch",
      detail:
        "Six negative mentions in the last 24 hours mention waiting times over 20 minutes. Five are in Azerbaijani, one in Russian.",
      reply: "Salam! Gözləməyə görə üzr istəyirik — komandamıza bu barədə məlumat verdik. Növbəti dəfə sizə daha sürətli xidmət göstərmək istərdik.",
    },
  },
  {
    slug: "online-shops",
    menuLabel: "For Online Shops",
    short: "Online Shops",
    icon: ShoppingBag,
    headline: "Catch the order problems before they turn into refunds",
    intro:
      "For an online shop, a damaged parcel or a stalled return is a lost customer and a public review at the same time. BrandPulse collects what shoppers say and groups repeated issues so you can fix the process, not just the one complaint you happened to see.",
    complaints: [
      {
        text: "Ordered size M and received something that fits like a small. The return page does not work.",
        lang: "EN",
        sentiment: "negative",
        topic: "Returns",
      },
      {
        text: "The item arrived scratched and nobody has answered my support emails.",
        lang: "EN",
        sentiment: "strongly_negative",
        topic: "Support",
      },
      {
        text: "Sifariş 10 gündür gəlmir və heç kim zəng etmir.",
        lang: "AZ",
        sentiment: "negative",
        topic: "Delivery",
      },
      {
        text: "Saytda göstərilən rəng gələn məhsuldan tamamilə fərqlidir.",
        lang: "AZ",
        sentiment: "negative",
        topic: "Product quality",
      },
      {
        text: "Вернул товар две недели назад, деньги до сих пор не вернули.",
        lang: "RU",
        sentiment: "strongly_negative",
        topic: "Refunds",
      },
    ],
    help: [
      {
        title: "Detect the complaints",
        text: "Reviews, comments and messages are read in English, Azerbaijani and Russian, and the unhappy ones are flagged automatically.",
      },
      {
        title: "Group them into incident threads",
        text: "A batch of “wrong size” reports becomes a single sizing incident, so you can see it is a pattern rather than bad luck.",
      },
      {
        title: "Alert with a priority score",
        text: "A refund thread that keeps growing outranks a single slow-delivery note and lands at the top of your inbox.",
      },
    ],
    alert: {
      priority: "Critical",
      title: "Refund delays mentioned 11 times this week",
      detail:
        "Eleven mentions describe refunds taking more than ten days. Three use the words “never replied”. Mixed EN, AZ and RU.",
      reply: "Thank you for flagging this — refunds should not take this long. We are checking your order now and will confirm the status today.",
    },
  },
  {
    slug: "delivery",
    menuLabel: "For Delivery & Logistics",
    short: "Delivery & Logistics",
    icon: Truck,
    headline: "See the routes that generate the complaints",
    intro:
      "Delivery problems are loud: parcels left in the rain, orders marked delivered that never arrive. They are also repetitive, which is exactly what BrandPulse is good at spotting — the same courier, the same zone, the same wording, grouped into one thread.",
    complaints: [
      {
        text: "Tracking says delivered, but nothing arrived and support cannot find my parcel.",
        lang: "EN",
        sentiment: "strongly_negative",
        topic: "Lost parcel",
      },
      {
        text: "The courier left the box outside in the rain without calling me.",
        lang: "EN",
        sentiment: "negative",
        topic: "Courier",
      },
      {
        text: "45 dəqiqə deyilən çatdırılma 3 saat çəkdi.",
        lang: "AZ",
        sentiment: "negative",
        topic: "Late delivery",
      },
      {
        text: "Sifarişi qonşuya veriblər və mənə heç bir mesaj gəlmədi.",
        lang: "AZ",
        sentiment: "negative",
        topic: "Courier",
      },
      {
        text: "Курьер не позвонил и оставил заказ у подъезда.",
        lang: "RU",
        sentiment: "negative",
        topic: "Courier",
      },
    ],
    help: [
      {
        title: "Detect the complaints",
        text: "Delivery language has its own vocabulary — “not received”, “left outside”, “gəlmədi” — and the analyser is tuned for it.",
      },
      {
        title: "Group them into incident threads",
        text: "Every “left outside” report in one district is merged, so you can see whether it is one courier or a whole shift.",
      },
      {
        title: "Alert with a priority score",
        text: "Lost parcels score higher than late ones, so the cases that need compensation get attention before they escalate.",
      },
    ],
    alert: {
      priority: "High",
      title: "“Left outside” reports up in one district",
      detail:
        "Five mentions in two days describe parcels left at the door without a call. All five are from the same delivery zone.",
      reply: "We are sorry your parcel was left unattended. We have flagged this delivery zone and will call before reattempting delivery.",
    },
  },
  {
    slug: "clinics",
    menuLabel: "For Clinics & Beauty Salons",
    short: "Clinics & Beauty Salons",
    icon: Stethoscope,
    headline: "Turn quiet dissatisfaction into a booked follow-up",
    intro:
      "A late appointment or an unclear bill rarely ends up in a formal complaint — it ends up in a review three weeks later, or nowhere at all. BrandPulse surfaces those signals while there is still time to reach out and win the client back.",
    complaints: [
      {
        text: "Called three times to reschedule and nobody picked up.",
        lang: "EN",
        sentiment: "negative",
        topic: "Reception",
      },
      {
        text: "I was billed for a treatment I never received.",
        lang: "EN",
        sentiment: "strongly_negative",
        topic: "Billing",
      },
      {
        text: "Randevu vaxtı 40 dəqiqə gecikdi və heç kim üzr istəmədi.",
        lang: "AZ",
        sentiment: "negative",
        topic: "Wait time",
      },
      {
        text: "Qəbuldan sonra izahat vermədilər, qiyməti yalnız kassada öyrəndim.",
        lang: "AZ",
        sentiment: "negative",
        topic: "Pricing",
      },
      {
        text: "Записали не на ту процедуру и не предложили перезаписаться.",
        lang: "RU",
        sentiment: "negative",
        topic: "Booking",
      },
    ],
    help: [
      {
        title: "Detect the complaints",
        text: "Billing and waiting-time complaints are picked out from routine feedback, even in short informal messages.",
      },
      {
        title: "Group them into incident threads",
        text: "Repeated complaints about the same reception hours become one thread you can act on with the team.",
      },
      {
        title: "Alert with a priority score",
        text: "Money-related and strongly worded complaints are ranked first so they are answered the same day.",
      },
    ],
    alert: {
      priority: "High",
      title: "Billing complaint needs a same-day reply",
      detail:
        "A client says they were charged for a service they did not receive. Marked strongly negative and grouped with two similar notes.",
      reply: "Thank you for telling us. We are reviewing the invoice with the front desk today and will call you with a correction.",
    },
  },
  {
    slug: "hotels",
    menuLabel: "For Hotels & Tourism",
    short: "Hotels & Tourism",
    icon: BedDouble,
    headline: "Answer the review before it defines your season",
    intro:
      "For a hotel, one bad review can outweigh twenty good ones. BrandPulse reads the review sites and messages your guests actually use, in their own language, and points out the recurring themes — rooms, breakfast, transfers — that quietly shape your rating.",
    complaints: [
      {
        text: "The room was not cleaned during our stay and the air conditioning did not work.",
        lang: "EN",
        sentiment: "strongly_negative",
        topic: "Room condition",
      },
      {
        text: "The booking said sea view; we got a wall and the car park.",
        lang: "EN",
        sentiment: "negative",
        topic: "Expectation mismatch",
      },
      {
        text: "Qeydiyyatda otaq hazır deyildi, iki saat gözlədik.",
        lang: "AZ",
        sentiment: "negative",
        topic: "Check-in",
      },
      {
        text: "Səhər yeməyi elan olunmadan bitdi.",
        lang: "AZ",
        sentiment: "negative",
        topic: "Breakfast",
      },
      {
        text: "Обещали трансфер из аэропорта, но никто не приехал.",
        lang: "RU",
        sentiment: "strongly_negative",
        topic: "Transfer",
      },
    ],
    help: [
      {
        title: "Detect the complaints",
        text: "Reviews and messages in EN, AZ and RU are scored, so a Russian review does not sit unanswered at the bottom of a list.",
      },
      {
        title: "Group them into incident threads",
        text: "Everything about the same weekend or the same room type is merged, showing you the story behind the score.",
      },
      {
        title: "Alert with a priority score",
        text: "Safety, cleanliness and transport failures reach the top so the duty manager sees them before check-in.",
      },
    ],
    alert: {
      priority: "High",
      title: "Cleanliness mentioned in 4 reviews this month",
      detail:
        "Four reviews across two languages mention housekeeping. Rating impact is concentrated on one floor.",
      reply: "Thank you for the honest feedback. We have asked housekeeping to review this floor today and would be glad to welcome you again.",
    },
  },
  {
    slug: "agencies",
    menuLabel: "For Small Agencies",
    short: "Small Agencies",
    icon: Briefcase,
    headline: "Protect your clients' reputation while you sleep",
    intro:
      "Agencies get blamed for complaints about their clients, and often hear about them from the client first. BrandPulse gives you the same picture in advance, across several projects, so you can send the heads-up instead of receiving it.",
    complaints: [
      {
        text: "We asked for one small change and it took the agency a whole week.",
        lang: "EN",
        sentiment: "negative",
        topic: "Responsiveness",
      },
      {
        text: "The monthly report had the wrong numbers for our campaign.",
        lang: "EN",
        sentiment: "negative",
        topic: "Reporting",
      },
      {
        text: "Layihə üçün yeni təklif vermədilər, eyni şablonu təkrarladılar.",
        lang: "AZ",
        sentiment: "negative",
        topic: "Creativity",
      },
      {
        text: "Hesabatda büdcə səhv göstərilib.",
        lang: "AZ",
        sentiment: "negative",
        topic: "Reporting",
      },
      {
        text: "Ответ на письмо ждали четыре дня, дедлайн сорвали.",
        lang: "RU",
        sentiment: "negative",
        topic: "Deadlines",
      },
    ],
    help: [
      {
        title: "Detect the complaints",
        text: "Each client project has its own stream, so feedback about one brand never blurs into another.",
      },
      {
        title: "Group them into incident threads",
        text: "Comments about the same campaign are grouped, which makes the weekly client update far quicker to write.",
      },
      {
        title: "Alert with a priority score",
        text: "Anything with strong language or a growing thread is pushed to you first, before your client finds it.",
      },
    ],
    alert: {
      priority: "Medium",
      title: "Growing thread about response times",
      detail:
        "Five mentions across three days criticise slow replies. Two are from accounts with a large following.",
      reply: "Thanks for the nudge — we have restructured how requests are triaged and will share the new response plan this week.",
    },
  },
];

export function getAudience(slug: string): Audience | undefined {
  return AUDIENCES.find((audience) => audience.slug === slug);
}
