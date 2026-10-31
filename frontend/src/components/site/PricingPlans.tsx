import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { COMPARISON, PLANS, PRICING_FAQ, type Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";

type Billing = "monthly" | "yearly";

function Price({ plan, billing }: { plan: Plan; billing: Billing }) {
  const { t } = useTranslation(["pricing", "common"]);
  const reduce = useReducedMotion();

  if (plan.priceMonthly === null) {
    return <span className="text-4xl font-bold tracking-tight">{t("pricing:plans.custom")}</span>;
  }

  const amount = billing === "monthly" ? plan.priceMonthly : (plan.priceYearly ?? plan.priceMonthly);

  return (
    <span className="flex items-end gap-1">
      <span className="text-2xl font-bold leading-none">$</span>
      <span className="relative inline-flex h-11 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`${plan.id}-${billing}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="text-4xl font-bold leading-none tabular-nums"
          >
            {amount}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="pb-1 text-sm font-medium text-muted-foreground">
        {t("pricing:plans.perMonth")}
      </span>
    </span>
  );
}

export function PricingPlans({
  showComparison = false,
  showFaq = false,
}: {
  showComparison?: boolean;
  showFaq?: boolean;
}) {
  const { t } = useTranslation(["pricing", "common"]);
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex flex-col items-center gap-4">
        <div
          role="group"
          aria-label={t("pricing:plans.billingAria")}
          className="inline-flex items-center rounded-full border border-border bg-card p-1"
        >
          {(["monthly", "yearly"] as Billing[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={billing === option}
              onClick={() => setBilling(option)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                billing === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`pricing:plans.${option}`)}
            </button>
          ))}
        </div>
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {billing === "yearly" ? t("pricing:plans.saveHintActive") : t("pricing:plans.saveHint")}
        </p>
      </div>

      {/* Plans */}
      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-3xl border bg-card p-7",
              plan.highlighted ? "border-primary shadow-[var(--shadow-glow)]" : "border-border",
            )}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                <Sparkles className="h-3 w-3" />
                {t("pricing:plans.mostPopular")}
              </span>
            )}

            <h3 className="text-lg font-bold">{t(`pricing:plans.items.${plan.id}.name`)}</h3>
            <p className="mt-1 min-h-[2.5rem] text-sm text-muted-foreground">
              {t(`pricing:plans.items.${plan.id}.tagline`)}
            </p>

            <div className="mt-6 flex items-baseline justify-between gap-2">
              <Price plan={plan} billing={billing} />
              {plan.id === "enterprise" && (
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("pricing:plans.talkToUs")}
                </span>
              )}
            </div>

            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature.key} className="flex items-start gap-2.5 text-sm">
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      feature.state === "available" ? "text-primary" : "text-muted-foreground/50",
                    )}
                  />
                  <span className={cn(feature.state === "soon" && "text-muted-foreground")}>
                    {t(`pricing:plans.features.${feature.key}`)}
                    {feature.state === "soon" && (
                      <span className="ml-2 whitespace-nowrap rounded-full bg-secondary-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground/60">
                        {t("common:labels.soon")}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              asChild
              variant={plan.highlighted ? "default" : "outline"}
              className={cn(
                "mt-8 h-auto min-h-12 w-full whitespace-normal rounded-full px-4 py-3 font-semibold",
                plan.highlighted && "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <Link to="/login" search={{ tab: "signup", plan: plan.id }}>
                {t(`pricing:plans.items.${plan.id}.cta`)}
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        {t("pricing:plans.prototypeNote")}
      </p>

      {/* Comparison table */}
      {showComparison && (
        <div className="mt-20">
          <h3 className="text-center text-2xl font-bold">{t("pricing:comparison.title")}</h3>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border">
                  <th scope="col" className="px-5 py-4 text-left font-semibold">
                    {t("pricing:comparison.featureColumn")}
                  </th>
                  {PLANS.map((plan) => (
                    <th key={plan.id} scope="col" className="px-5 py-4 text-left font-semibold">
                      {t(`pricing:plans.items.${plan.id}.name`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((group) => (
                  <Fragment key={group.group}>
                    <tr className="bg-secondary-tint/60">
                      <th
                        scope="colgroup"
                        colSpan={5}
                        className="px-5 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                      >
                        {t(`pricing:comparison.groups.${group.group}`)}
                      </th>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={`${group.group}-${row.feature}`} className="border-t border-border/60">
                        <th scope="row" className="px-5 py-3 text-left font-medium text-foreground">
                          {t(`pricing:comparison.rows.${row.feature}`)}
                          {row.soon && (
                            <span className="ml-2 whitespace-nowrap rounded-full bg-secondary-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground/60">
                              {t("common:labels.soon")}
                            </span>
                          )}
                        </th>
                        {row.values.map((value, index) => (
                          <td key={index} className="px-5 py-3 text-muted-foreground">
                            {t(`pricing:comparison.values.${value}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAQ */}
      {showFaq && (
        <div className="mx-auto mt-20 max-w-3xl">
          <h3 className="text-center text-2xl font-bold">{t("pricing:faq.title")}</h3>
          <Accordion type="single" collapsible className="mt-8">
            {PRICING_FAQ.map((key) => (
              <AccordionItem key={key} value={`faq-${key}`}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {t(`pricing:faq.items.${key}.question`)}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {t(`pricing:faq.items.${key}.answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}
