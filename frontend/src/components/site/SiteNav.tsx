import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Activity, ChevronDown, LayoutGrid, Menu, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { LanguageOptions, LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { AppResources } from "@/i18n/locale-types";
import { AUDIENCES, type AudienceLabelKey, type AudienceSlug } from "@/lib/audiences";
import { SECTION_IDS, scrollToSection, type SectionId } from "@/lib/scroll";
import { cn } from "@/lib/utils";

/** Center links that scroll to a section of the landing page. */
const SECTION_LINKS: { id: SectionId; key: "nav:howItWorks" | "nav:useCases" | "nav:pricing" }[] = [
  { id: "how-it-works", key: "nav:howItWorks" },
  { id: "use-cases", key: "nav:useCases" },
  { id: "pricing", key: "nav:pricing" },
];

type MenuDescriptionKey = `nav:menuDescriptions.${keyof AppResources["nav"]["menuDescriptions"]}`;

type MenuEntry = {
  key: string;
  labelKey: "nav:features" | AudienceLabelKey;
  descriptionKey: MenuDescriptionKey;
  icon: LucideIcon;
  slug?: AudienceSlug;
};

const PRODUCT_ENTRIES: MenuEntry[] = [
  {
    key: "features",
    labelKey: "nav:features",
    descriptionKey: "nav:menuDescriptions.features",
    icon: LayoutGrid,
  },
  ...AUDIENCES.map((audience) => ({
    key: audience.slug,
    labelKey: `audiences:${audience.slug}.menuLabel` as AudienceLabelKey,
    descriptionKey: `nav:menuDescriptions.${audience.slug}` as MenuDescriptionKey,
    icon: audience.icon,
    slug: audience.slug as AudienceSlug,
  })),
];

function Logo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Activity className="h-4 w-4" />
      </span>
      <span className="text-xl font-bold tracking-tight">BrandPulse</span>
    </Link>
  );
}

/**
 * Sticky public navigation, shared by the landing page, /pricing, /blog and the
 * audience pages. Section links scroll in place on "/" and navigate home first
 * from anywhere else.
 */
export function SiteNav() {
  const { t } = useTranslation(["nav", "audiences"]);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const reduce = useReducedMotion();

  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeTimer = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  // Subtle blur + border once the page has scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the section currently in view (landing page only).
  useEffect(() => {
    if (pathname !== "/") {
      setActiveSection(null);
      return;
    }
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (element): element is HTMLElement => element !== null,
    );
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pathname]);

  // Close any open menu when the route changes.
  useEffect(() => {
    setProductOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Close the Product menu on an outside click.
  useEffect(() => {
    if (!productOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setProductOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [productOpen]);

  const goToSection = useCallback(
    (id: string) => {
      setProductOpen(false);
      setMobileOpen(false);
      if (pathname === "/") {
        window.history.replaceState(null, "", `#${id}`);
        scrollToSection(id);
        return;
      }
      void navigate({ to: "/" }).then(() => {
        window.setTimeout(() => {
          window.history.replaceState(null, "", `#${id}`);
          scrollToSection(id);
        }, 80);
      });
    },
    [navigate, pathname],
  );

  const menuItems = useCallback(
    () => itemRefs.current.filter((item): item is HTMLElement => item !== null),
    [],
  );

  const focusItem = useCallback(
    (index: number) => {
      const items = menuItems();
      if (!items.length) return;
      const next = (index + items.length) % items.length;
      items[next]?.focus();
    },
    [menuItems],
  );

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    const items = menuItems();
    const current = items.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(items.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        setProductOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setProductOpen(false);
        break;
      default:
        break;
    }
  };

  const openProductMenu = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setProductOpen(true);
  };

  const closeProductMenuSoon = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setProductOpen(false), 140);
  };

  const navLinkClass = (isActive: boolean) =>
    cn(
      "relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      isActive ? "text-primary" : "text-foreground/70 hover:text-foreground",
    );

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/80 py-2 backdrop-blur-md"
          : "border-b border-transparent py-4",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-10">
        <Logo />

        {/* Center links (desktop). Shown from xl: the Russian/Azerbaijani labels
            are ~25% longer than English and would overflow the lg (1024px) row. */}
        <div className="hidden items-center gap-1 xl:flex">
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={openProductMenu}
            onMouseLeave={closeProductMenuSoon}
          >
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={productOpen}
              aria-controls="product-menu"
              onClick={() => setProductOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  openProductMenu();
                  window.setTimeout(() => focusItem(0), 0);
                }
              }}
              className={cn(
                navLinkClass(productOpen),
                "flex items-center gap-1",
              )}
            >
              {t("nav:product")}
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-200", productOpen && "rotate-180")}
              />
            </button>

            <AnimatePresence>
              {productOpen && (
                <motion.div
                  id="product-menu"
                  role="menu"
                  aria-label={t("nav:productMenuLabel")}
                  onKeyDown={handleMenuKeyDown}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="absolute left-1/2 top-full z-50 mt-3 w-[22rem] -translate-x-1/2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-panel)]"
                >
                  {PRODUCT_ENTRIES.map((entry, index) => {
                    const Icon = entry.icon;
                    const content = (
                      <>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-tint text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {t(entry.labelKey)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {t(entry.descriptionKey)}
                          </span>
                        </span>
                      </>
                    );
                    const itemClass =
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-secondary-tint focus-visible:bg-secondary-tint focus-visible:outline-none";
                    return entry.slug ? (
                      <Link
                        key={entry.key}
                        ref={(element) => {
                          itemRefs.current[index] = element;
                        }}
                        role="menuitem"
                        to="/for/$slug"
                        params={{ slug: entry.slug }}
                        onClick={() => setProductOpen(false)}
                        className={itemClass}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        key={entry.key}
                        ref={(element) => {
                          itemRefs.current[index] = element;
                        }}
                        type="button"
                        role="menuitem"
                        onClick={() => goToSection(entry.key)}
                        className={itemClass}
                      >
                        {content}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {SECTION_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => goToSection(link.id)}
              className={navLinkClass(pathname === "/" && activeSection === link.id)}
            >
              {t(link.key)}
            </button>
          ))}

          <Link to="/blog" className={navLinkClass(pathname.startsWith("/blog"))}>
            {t("nav:blog")}
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <Button
            variant="ghost"
            asChild
            className="hidden whitespace-nowrap rounded-full bg-primary-tint px-5 font-semibold text-primary hover:bg-primary-tint/70 sm:inline-flex"
          >
            <Link to="/login" search={{ tab: "signin" }}>
              {t("nav:login")}
            </Link>
          </Button>
          <Button
            asChild
            className="hidden whitespace-nowrap rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 lg:inline-flex"
          >
            <Link to="/login" search={{ tab: "signup" }}>
              {t("nav:startTrial")}
            </Link>
          </Button>

          {/* Mobile */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={t("nav:openMenu")}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[19rem] overflow-y-auto bg-background p-6">
              <SheetTitle className="sr-only">{t("nav:navigation")}</SheetTitle>
              <div className="mt-2">
                <Logo onNavigate={() => setMobileOpen(false)} />
              </div>

              <div className="mt-8 flex flex-col gap-1">
                <Accordion type="single" collapsible>
                  <AccordionItem value="product" className="border-b-0">
                    <AccordionTrigger className="rounded-lg px-3 py-3 text-sm font-semibold hover:no-underline">
                      {t("nav:product")}
                    </AccordionTrigger>
                    <AccordionContent className="pb-1 pl-2">
                      <div className="flex flex-col gap-1">
                        {PRODUCT_ENTRIES.map((entry) => {
                          const Icon = entry.icon;
                          return entry.slug ? (
                            <Link
                              key={entry.key}
                              to="/for/$slug"
                              params={{ slug: entry.slug }}
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary-tint"
                            >
                              <Icon className="h-4 w-4 text-primary" />
                              {t(entry.labelKey)}
                            </Link>
                          ) : (
                            <button
                              key={entry.key}
                              type="button"
                              onClick={() => goToSection(entry.key)}
                              className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground/80 transition-colors hover:bg-secondary-tint"
                            >
                              <Icon className="h-4 w-4 text-primary" />
                              {t(entry.labelKey)}
                            </button>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {SECTION_LINKS.map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => goToSection(link.id)}
                    className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-foreground/80 transition-colors hover:bg-secondary-tint"
                  >
                    {t(link.key)}
                  </button>
                ))}
                <Link
                  to="/blog"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-secondary-tint"
                >
                  {t("nav:blog")}
                </Link>
                <Link
                  to="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-secondary-tint"
                >
                  {t("nav:pricingPage")}
                </Link>
                <LanguageOptions className="mt-2 border-t border-border pt-2" />
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <Button
                  variant="ghost"
                  asChild
                  className="w-full rounded-full bg-primary-tint font-semibold text-primary hover:bg-primary-tint/70"
                >
                  <Link to="/login" search={{ tab: "signin" }} onClick={() => setMobileOpen(false)}>
                    {t("nav:login")}
                  </Link>
                </Button>
                <Button asChild className="w-full rounded-full bg-primary font-semibold text-primary-foreground">
                  <Link to="/login" search={{ tab: "signup" }} onClick={() => setMobileOpen(false)}>
                    {t("nav:startTrial")}
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
