import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, BellRing, Layers, MessageSquareText, ScanSearch } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import enAudiences from "@/locales/en/audiences.json";
import { getAudience } from "@/lib/audiences";
import type { SentimentLabel } from "@/lib/api";
import { MENTION_LANGUAGE_KEYS, PRIORITY_KEYS, SENTIMENT_KEYS } from "@/lib/enums";
import { TIER_CLASSES } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/for/$slug")({
  // English fallback for the prerendered HTML; `useDocumentMeta` replaces it with
  // the active language as soon as the app mounts.
  head: ({ params }) => {
    const audience = getAudience(params.slug);
    return {
      meta: [
        {
          title: audience
            ? `${enAudiences[audience.slug].menuLabel} — BrandPulse`
            : "Not found — BrandPulse",
        },
        {
          name: "description",
          content: audience
            ? enAudiences[audience.slug].intro.slice(0, 155)
            : "This BrandPulse use case page could not be found.",
        },
      ],
    };
  },
  component: AudiencePage,
});

const SENTIMENT_BADGE: Record<SentimentLabel, string> = {
  positive: "border-risk-low/40 bg-risk-low/15 text-risk-low",
  neutral: "border-border bg-secondary-tint text-muted-foreground",
  negative: "border-risk-high/40 bg-risk-high/15 text-risk-high",
  strongly_negative: "border-risk-critical/40 bg-risk-critical/15 text-risk-critical",
};

const LANG_BADGE: Record<"EN" | "AZ" | "RU", string> = {
  EN: "bg-secondary-tint text-foreground/70",
  AZ: "bg-primary-tint text-primary",
  RU: "bg-secondary-tint text-foreground/70",
};

const HELP_ICONS = [ScanSearch, Layers, BellRing];
const HELP_STEPS = ["detect", "group", "alert"] as const;

function AudiencePage() {
  const { t } = useTranslation(["audiences", "common"]);
  const { slug } = Route.useParams();
  const audience = getAudience(slug);

  if (!audience) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <main className="mx-auto max-w-2xl px-6 pb-24 pt-40 text-center md:px-10">
          <h1 className="text-3xl font-serif">{t("audiences:page.notFoundTitle")}</h1>
          <p className="mt-4 text-muted-foreground">{t("audiences:page.notFoundBody")}</p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("audiences:page.backHome")}
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const Icon = audience.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <main className="pb-24 pt-32">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-6 md:px-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("audiences:page.backHome")}
          </Link>
          <div className="mt-8 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-tint text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t(`audiences:${audience.slug}.menuLabel`)}
            </span>
          </div>
          <h1 className="mt-6 text-4xl font-serif leading-tight md:text-5xl">
            {t(`audiences:${audience.slug}.headline`)}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            {t(`audiences:${audience.slug}.intro`)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              search={{ tab: "signup" }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              {t("audiences:page.signUpFree")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              hash="how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary-tint"
            >
              {t("audiences:page.seeHowItWorks")}
            </Link>
          </div>
        </section>

        {/* Complaints */}
        <section className="mx-auto mt-20 max-w-4xl px-6 md:px-10">
          <h2 className="text-2xl font-serif md:text-3xl">{t("audiences:page.complaintsTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("audiences:page.complaintsSubtitle")}</p>
          <div className="mt-8 space-y-3">
            {audience.complaints.map((complaint) => (
              <div key={complaint.text} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-foreground/85">{complaint.text}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                      LANG_BADGE[complaint.lang],
                    )}
                  >
                    {t(`common:${MENTION_LANGUAGE_KEYS[complaint.lang]}`)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                      SENTIMENT_BADGE[complaint.sentiment],
                    )}
                  >
                    {t(`common:${SENTIMENT_KEYS[complaint.sentiment]}`)}
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t(complaint.topicKey)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How BrandPulse helps */}
        <section className="mx-auto mt-20 max-w-4xl px-6 md:px-10">
          <h2 className="text-2xl font-serif md:text-3xl">{t("audiences:page.helpTitle")}</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {HELP_STEPS.map((step, index) => {
              const HelpIcon = HELP_ICONS[index] ?? ScanSearch;
              return (
                <div key={step} className="rounded-2xl border border-border bg-card p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-tint text-primary">
                    <HelpIcon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">
                    {t(`audiences:${audience.slug}.help.${step}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`audiences:${audience.slug}.help.${step}.text`)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Example alert */}
        <section className="mx-auto mt-20 max-w-3xl px-6 md:px-10">
          <h2 className="text-2xl font-serif md:text-3xl">{t("audiences:page.alertTitle")}</h2>
          <div className="mt-8 rounded-3xl border border-border bg-card p-7">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-primary" />
                {t("audiences:page.alertEyebrow")}
              </span>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
                  TIER_CLASSES[audience.alertPriority],
                )}
              >
                {t("audiences:page.prioritySuffix", {
                  priority: t(`common:${PRIORITY_KEYS[audience.alertPriority]}`),
                })}
              </span>
            </div>
            <h3 className="mt-5 text-xl font-bold">{t(`audiences:${audience.slug}.alert.title`)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t(`audiences:${audience.slug}.alert.detail`)}
            </p>

            <div className="mt-6 rounded-2xl border border-border bg-background p-5">
              <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <MessageSquareText className="h-3.5 w-3.5" />
                {t("audiences:page.draftLabel")}
              </p>
              <p className="mt-3 text-sm italic leading-relaxed text-foreground/80">
                “{t(`audiences:${audience.slug}.alert.reply`)}”
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">{t("audiences:page.draftNote")}</p>
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto mt-20 max-w-4xl px-6 md:px-10">
          <div className="rounded-[2rem] border border-border bg-card px-8 py-12 text-center md:px-14">
            <h2 className="text-3xl font-serif leading-tight md:text-4xl">
              {t("audiences:page.ctaTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              {t("audiences:page.ctaBody")}
            </p>
            <Link
              to="/login"
              search={{ tab: "signup" }}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              {t("audiences:page.signUpFree")}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
