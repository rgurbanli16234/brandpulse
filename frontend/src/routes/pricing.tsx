import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-10">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Pricing
          </p>
          <h1 className="mt-4 text-4xl font-serif leading-tight md:text-5xl">
            Simple plans, clearly labelled
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Start with the free demo plan and see how BrandPulse handles your own mentions. Every
            feature below is marked as available today or coming soon — nothing is dressed up.
          </p>
        </header>

        <div className="mt-16">
          <PricingPlans showComparison showFaq />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
