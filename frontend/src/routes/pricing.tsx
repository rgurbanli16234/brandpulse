import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PricingPlans } from "@/components/site/PricingPlans";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — BrandPulse" },
      {
        name: "description",
        content:
          "Illustrative BrandPulse plans for small and medium businesses: a free demo, Pro, Business and Enterprise. Feature availability is labelled honestly.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { t } = useTranslation("pricing");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-10">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {t("page.eyebrow")}
          </p>
          <h1 className="mt-4 text-4xl font-serif leading-tight md:text-5xl">{t("page.title")}</h1>
          <p className="mt-5 text-lg text-muted-foreground">{t("page.subtitle")}</p>
        </header>

        <div className="mt-16">
          <PricingPlans showComparison showFaq />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
