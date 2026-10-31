import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";

import { AUDIENCES } from "@/lib/audiences";

/** Shared public footer. Only points at pages that actually exist. */
export function SiteFooter() {
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
              Built for small and medium businesses in Azerbaijan and beyond. BrandPulse separates
              urgent complaints from everyday chatter so one person can keep up with every channel.
            </p>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Product
            </h4>
            <ul className="space-y-3 text-sm font-medium">
              <li>
                <Link to="/" hash="features" className="transition-colors hover:text-primary">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/" hash="how-it-works" className="transition-colors hover:text-primary">
                  How it works
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="transition-colors hover:text-primary">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/blog" className="transition-colors hover:text-primary">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Use cases
            </h4>
            <ul className="space-y-3 text-sm font-medium">
              {AUDIENCES.slice(0, 4).map((audience) => (
                <li key={audience.slug}>
                  <Link
                    to="/for/$slug"
                    params={{ slug: audience.slug }}
                    className="transition-colors hover:text-primary"
                  >
                    {audience.short}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-border/30 pt-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} BrandPulse. A prototype for demonstration purposes.</p>
          <p>
            Mentions come from CSV, manual paste and RSS feeds. No social network monitoring.
          </p>
        </div>
      </div>
    </footer>
  );
}
