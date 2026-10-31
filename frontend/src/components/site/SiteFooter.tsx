import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AUDIENCES, type AudienceShortKey } from "@/lib/audiences";

/** Shared public footer. Only points at pages that actually exist. */
export function SiteFooter() {
  const { t } = useTranslation(["nav", "audiences"]);

  return (
    <footer className="border-t border-border/40 bg-card px-6 py-16 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
              </span>
              <span className="text-2xl font-bold tracking-tight">BrandPulse</span>
            </Link>
            <p className="mt-5 max-w-sm leading-relaxed text-muted-foreground">
              {t("nav:footer.tagline")}
            </p>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("nav:footer.productHeading")}
            </h4>
            <ul className="space-y-3 text-sm font-medium">
              <li>
                <Link to="/" hash="features" className="transition-colors hover:text-primary">
                  {t("nav:features")}
                </Link>
              </li>
              <li>
                <Link to="/" hash="how-it-works" className="transition-colors hover:text-primary">
                  {t("nav:howItWorks")}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="transition-colors hover:text-primary">
                  {t("nav:pricing")}
                </Link>
              </li>
              <li>
                <Link to="/blog" className="transition-colors hover:text-primary">
                  {t("nav:blog")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("nav:footer.useCasesHeading")}
            </h4>
            <ul className="space-y-3 text-sm font-medium">
              {AUDIENCES.slice(0, 4).map((audience) => (
                <li key={audience.slug}>
                  <Link
                    to="/for/$slug"
                    params={{ slug: audience.slug }}
                    className="transition-colors hover:text-primary"
                  >
                    {t(`audiences:${audience.slug}.short` as AudienceShortKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-border/30 pt-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>{t("nav:footer.copyright", { year: new Date().getFullYear() })}</p>
          <p>{t("nav:footer.sourcesNote")}</p>
        </div>
      </div>
    </footer>
  );
}
