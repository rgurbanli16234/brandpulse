import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Activity,
  MessageSquareText,
  Layers,
  BellRing,
  FlaskConical,
  Check,
  Star,
  ShieldCheck,
  Zap,
  ChevronRight,
  FileSpreadsheet,
  Rss,
  ClipboardPaste,
} from "lucide-react";
import {
  MotionConfig,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

import { PricingPlans } from "@/components/site/PricingPlans";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { AUDIENCES } from "@/lib/audiences";
import { scrollToSection } from "@/lib/scroll";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BrandPulse — Brand Sentiment & Complaint Monitoring" },
      {
        name: "description",
        content:
          "BrandPulse separates urgent complaints from everyday chatter, groups related problems into incident threads, and tells you what needs attention now.",
      },
    ],
  }),
  component: LandingPage,
});

/** Sample figures shown inside the product mockup. Not real usage data. */
const MOCK_CHART_DATA = [
  { day: 1, mood: 60 },
  { day: 2, mood: 65 },
  { day: 3, mood: 58 },
  { day: 4, mood: 62 },
  { day: 5, mood: 68 },
  { day: 6, mood: 64 },
  { day: 7, mood: 60 },
  { day: 8, mood: 63 },
  { day: 9, mood: 61 },
  { day: 10, mood: 55 },
  { day: 11, mood: 57 },
  { day: 12, mood: 52 },
  { day: 13, mood: 50 },
  { day: 14, mood: 48 },
];

/** Placeholder topics for the mockup — no real brands or customers. */
const SAMPLE_MENTIONS = [
  { label: "Late delivery", detail: "18 mentions · negative" },
  { label: "Order arrived cold", detail: "11 mentions · strongly negative" },
  { label: "Refund not received", detail: "7 mentions · negative" },
  { label: "Friendly staff", detail: "9 mentions · positive" },
  { label: "Booking confusion", detail: "4 mentions · neutral" },
];

function Counter({ value, duration = 2 }: { value: number; duration?: number }) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduce) {
      setCount(value);
      return;
    }
    let start = 0;
    const end = value;
    if (start === end) return;

    const totalMiliseconds = duration * 1000;
    const incrementTime = totalMiliseconds / end;

    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration, reduce]);

  return <span>{count}</span>;
}

function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Support deep links such as /#pricing coming from the footer or another page.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const timer = window.setTimeout(() => scrollToSection(hash), 120);
    return () => window.clearTimeout(timer);
  }, []);

  const mockupY = useTransform(scrollYProgress, [0, 0.2], [100, 0]);
  const mockupRotateX = useTransform(scrollYProgress, [0, 0.2], [15, 0]);
  const springMockupY = useSpring(mockupY, { stiffness: 100, damping: 30 });
  const springMockupRotateX = useSpring(mockupRotateX, { stiffness: 100, damping: 30 });

  const headline = "Measure Your Brand Awareness.";
  const words = headline.split(" ");

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={containerRef}
        className="relative min-h-screen overflow-x-hidden bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground"
      >
        {/* Decorative grid */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(var(--color-border) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <SiteNav />

        <main className="relative z-10 pt-32">
          {/* Hero */}
          <section className="container mx-auto px-6 text-center md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-foreground/60"
            >
              <Star className="h-3 w-3 fill-primary text-primary" />
              Complaint radar for small businesses
            </motion.div>

            <h1 className="mt-8 font-serif text-[clamp(2.5rem,8vw,5rem)] leading-[1.1] tracking-tight">
              {words.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="mr-[0.2em] inline-block"
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-foreground/60"
            >
              BrandPulse reads the mentions you already have — CSV exports, copied messages and
              RSS feeds,<br className="hidden md:block" /> separates real complaints from everyday
              chatter, and shows what needs a reply today.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-12 flex flex-col items-center gap-6"
            >
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  asChild
                  className="group relative h-14 overflow-hidden rounded-full bg-foreground px-10 text-lg font-semibold text-background transition-all hover:scale-105 active:scale-95"
                >
                  <Link to="/login" search={{ tab: "signup" }}>
                    Sign up free
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-14 rounded-full border-border px-8 text-base font-semibold"
                >
                  <Link to="/pricing">
                    See pricing
                    <ChevronRight className="ml-1 h-5 w-5" />
                  </Link>
                </Button>
              </div>

              <p className="text-sm font-medium text-foreground/60">
                Built for small and medium businesses in Azerbaijan and beyond.
              </p>
            </motion.div>
          </section>

          {/* Product mockup */}
          <section className="relative mt-20 overflow-hidden pb-20">
            <div className="absolute left-10 top-1/2 hidden -translate-y-1/2 grid-cols-2 gap-4 opacity-40 lg:grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary" />
              ))}
            </div>
            <div className="absolute right-10 top-1/2 hidden -translate-y-1/2 grid-cols-2 gap-4 opacity-40 lg:grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-1.5 w-1.5 rounded-full bg-secondary" />
              ))}
            </div>

            <motion.div
              style={{
                y: springMockupY,
                rotateX: springMockupRotateX,
                perspective: "1000px",
              }}
              className="container mx-auto max-w-6xl px-6"
            >
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-primary/5">
                <div className="absolute right-4 top-4 z-30 rounded-full border border-border bg-background/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground/60 backdrop-blur">
                  Sample data
                </div>
                <div className="flex h-[600px]">
                  {/* Mock sidebar */}
                  <div className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
                    <div className="p-6">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                          <Activity className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <span className="text-sm font-bold text-sidebar-foreground">BrandPulse</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1 px-3">
                      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">
                        Projects
                      </div>
                      <div className="group flex cursor-pointer items-center justify-between rounded-md bg-sidebar-accent px-3 py-2 text-sidebar-accent-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <span className="text-xs font-semibold">Sample project</span>
                        </div>
                        <span className="text-[9px] opacity-60">Demo</span>
                      </div>

                      <div className="space-y-1 pt-6">
                        {[
                          { icon: MessageSquareText, label: "Mentions" },
                          { icon: Layers, label: "Summary" },
                          { icon: FlaskConical, label: "Analysis", active: true },
                          { icon: BellRing, label: "Sources" },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                              item.active
                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40",
                            )}
                          >
                            <item.icon
                              className={cn(
                                "h-4 w-4",
                                item.active ? "text-primary" : "text-sidebar-foreground/40",
                              )}
                            />
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mock main content */}
                  <div className="flex min-w-0 flex-1 flex-col bg-background">
                    <header className="flex h-14 items-center gap-4 border-b border-border px-6">
                      <div className="relative max-w-md flex-1">
                        <div className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/30">
                          <Activity className="h-full w-full" />
                        </div>
                        <div className="flex h-8 w-full items-center rounded-md bg-secondary-tint pl-10 text-[10px] text-foreground/40">
                          Search through mentions, authors &amp; domains...
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-tint">
                          <BellRing className="h-4 w-4 text-foreground/40" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">Demo user</span>
                          <div className="h-8 w-8 overflow-hidden rounded-full bg-primary/20">
                            <Activity className="h-full w-full p-1.5 text-primary" />
                          </div>
                        </div>
                      </div>
                    </header>

                    <div className="flex-1 overflow-hidden p-6">
                      <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Layers className="h-4 w-4 text-primary" />
                              <span className="text-sm font-bold">Summary</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-5 gap-4">
                            {[
                              { label: "MENTIONS", val: 300, unit: "K", delta: "+35.1 K (+10%)", color: "text-primary" },
                              { label: "REACH", val: 639, unit: "M", delta: "+77.1 M (+11%)", color: "text-foreground" },
                              { label: "INTERACTIONS", val: 16, unit: "M", delta: "+9.0 M (+35%)", color: "text-foreground" },
                              { label: "POSITIVE", val: 65, unit: "K", delta: "+97.0 (+17%)", color: "text-risk-low" },
                              { label: "NEGATIVE", val: 46, unit: "K", delta: "-18.5 K (-20%)", color: "text-risk-critical" },
                            ].map((kpi, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="rounded-lg border border-border bg-card p-3"
                              >
                                <div className="text-[8px] font-bold tracking-widest text-foreground/40">
                                  {kpi.label}
                                </div>
                                <div className={cn("mt-1 text-lg font-bold", kpi.color)}>
                                  <Counter value={kpi.val} /> {kpi.unit}
                                </div>
                                <div className="mt-1 text-[7px] font-bold opacity-60">{kpi.delta}</div>
                              </motion.div>
                            ))}
                          </div>

                          <div className="flex min-h-[250px] flex-1 flex-col rounded-lg border border-border bg-card p-4">
                            <div className="mb-4 flex items-center gap-2">
                              <Activity className="h-4 w-4 text-primary" />
                              <span className="text-xs font-bold">Mentions</span>
                            </div>
                            <div className="h-full w-full flex-1">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={MOCK_CHART_DATA}>
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="var(--color-border)"
                                    opacity={0.5}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="mood"
                                    stroke="var(--color-primary)"
                                    strokeWidth={3}
                                    dot={false}
                                    animationDuration={2000}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-4 rounded-full bg-primary" />
                            <span className="text-sm font-bold">Top topics</span>
                          </div>
                          <div className="space-y-3">
                            {SAMPLE_MENTIONS.map((mention, i) => (
                              <motion.div
                                key={mention.label}
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-tint text-[10px] font-bold text-primary">
                                    {mention.label[0]}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold">{mention.label}</div>
                                    <div className="text-[9px] text-foreground/40">{mention.detail}</div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 z-20 h-32 bg-gradient-to-t from-background to-transparent" />
              </div>
            </motion.div>
          </section>

          {/* How it works */}
          <section
            id="how-it-works"
            className="container mx-auto scroll-mt-24 px-6 py-32 md:px-12"
          >
            <div className="mb-20 text-center">
              <h2 className="font-serif text-4xl md:text-5xl">How it works</h2>
              <p className="mx-auto mt-4 max-w-xl font-serif italic text-foreground/60">
                Separating signal from noise in three simple steps.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
              {[
                {
                  title: "Bring your mentions in",
                  desc: "Upload a CSV export, paste messages by hand, or subscribe to an RSS feed. No social media logins, ever.",
                  icon: FileSpreadsheet,
                },
                {
                  title: "BrandPulse reads them",
                  desc: "Each mention gets a sentiment, a language (EN/AZ/RU) and a topic. Complaints are separated from ordinary chatter.",
                  icon: Zap,
                },
                {
                  title: "Act on what matters",
                  desc: "Related complaints are grouped into incident threads and scored, so you can answer the loudest problem first.",
                  icon: BellRing,
                },
              ].map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.2 }}
                  className="group relative text-center"
                >
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary-tint transition-transform group-hover:scale-110">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-4 select-none font-serif text-6xl text-primary/5">
                    {i + 1}
                  </div>
                  <h3 className="mb-4 text-xl font-bold">{step.title}</h3>
                  <p className="leading-relaxed text-foreground/60">{step.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-xs font-bold uppercase tracking-widest text-foreground/40">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" /> CSV upload
              </span>
              <span className="flex items-center gap-2">
                <ClipboardPaste className="h-4 w-4 text-primary" /> Manual paste
              </span>
              <span className="flex items-center gap-2">
                <Rss className="h-4 w-4 text-primary" /> RSS feeds
              </span>
            </div>
          </section>

          {/* Features */}
          <section id="features" className="scroll-mt-24 bg-secondary-tint py-32">
            <div className="container mx-auto px-6 md:px-12">
              <div className="mb-16 text-center">
                <h2 className="font-serif text-4xl md:text-5xl">Features</h2>
                <p className="mx-auto mt-4 max-w-xl text-foreground/60">
                  Everything BrandPulse does today, without the enterprise baggage.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-10 lg:col-span-8">
                  <div className="relative z-10">
                    <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Layers className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-4 font-serif text-3xl">Incident clustering</h3>
                    <p className="max-w-md text-foreground/60">
                      Related complaints are grouped into a single thread, so twenty separate
                      messages about one cold meal read as one problem — not twenty.
                    </p>
                  </div>
                  <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 opacity-10 transition-transform group-hover:scale-110">
                    <Layers className="h-64 w-64 text-primary" />
                  </div>
                </div>

                <div className="group flex flex-col justify-between rounded-3xl bg-foreground p-10 text-background lg:col-span-4">
                  <div>
                    <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-background/10">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-4 font-serif text-3xl text-background">Priority scoring</h3>
                    <p className="text-background/60">
                      Every thread is scored on how negative it is, how far it could travel and how
                      fast it is growing — then labelled Low to Critical.
                    </p>
                  </div>
                  <div className="mt-12 flex justify-end">
                    <ArrowRight className="h-10 w-10 text-primary transition-transform group-hover:translate-x-2" />
                  </div>
                </div>

                <div className="group rounded-3xl bg-primary p-10 text-primary-foreground lg:col-span-4">
                  <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                    <MessageSquareText className="h-6 w-6" />
                  </div>
                  <h3 className="mb-4 font-serif text-3xl">Multilingual</h3>
                  <p className="font-serif italic text-primary-foreground/70">
                    Azərbaycan dili, Русский, English — complaint rules tuned per language, not
                    translated after the fact.
                  </p>
                </div>

                <div className="group flex items-center justify-between overflow-hidden rounded-3xl border border-border bg-card p-10 lg:col-span-8">
                  <div className="relative z-10 max-w-md">
                    <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20">
                      <ShieldCheck className="h-6 w-6 text-foreground" />
                    </div>
                    <h3 className="mb-4 font-serif text-3xl">Privacy first</h3>
                    <p className="text-foreground/60">
                      There is no social network monitoring and no password sharing. You upload,
                      paste or subscribe to a feed — the text stays inside your own instance.
                    </p>
                  </div>
                  <div className="hidden opacity-5 transition-transform group-hover:rotate-12 md:block">
                    <ShieldCheck className="h-48 w-48 text-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Use cases */}
          <section id="use-cases" className="container mx-auto scroll-mt-24 px-6 py-32 md:px-12">
            <div className="mb-16 text-center">
              <h2 className="font-serif text-4xl md:text-5xl">Use cases</h2>
              <p className="mx-auto mt-4 max-w-2xl text-foreground/60">
                The complaints look different depending on what you sell, so the examples do too.
                Pick the one closest to your business.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {AUDIENCES.map((audience, i) => {
                const Icon = audience.icon;
                return (
                  <motion.div
                    key={audience.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Link
                      to="/for/$slug"
                      params={{ slug: audience.slug }}
                      className="group flex h-full flex-col rounded-3xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-tint text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-6 w-6" />
                      </span>
                      <h3 className="text-lg font-bold">{audience.menuLabel}</h3>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/60">
                        {audience.intro}
                      </p>
                      <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                        See examples
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="scroll-mt-24 bg-secondary-tint py-32">
            <div className="container mx-auto px-6 md:px-12">
              <div className="mb-14 text-center">
                <h2 className="font-serif text-4xl md:text-5xl">Pricing</h2>
                <p className="mx-auto mt-4 max-w-2xl text-foreground/60">
                  Start free. Upgrade when one person can no longer keep up on their own.
                </p>
              </div>

              <PricingPlans />

              <div className="mt-12 text-center">
                <Button variant="outline" asChild className="rounded-full border-border px-8 font-semibold">
                  <Link to="/pricing">
                    Compare all plans
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="container mx-auto px-6 py-32 text-center md:px-12">
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[3rem] border border-border bg-card p-12 md:p-20">
              <div className="absolute left-0 top-0 h-2 w-full bg-primary" />
              <h2 className="mb-8 font-serif text-4xl md:text-6xl">
                Ready to hear what really matters?
              </h2>
              <p className="mx-auto mb-12 max-w-2xl text-xl text-foreground/60">
                Start with the free Demo plan, paste in a handful of real messages and see what
                BrandPulse picks out. No payment is taken.
              </p>
              <Button
                size="lg"
                asChild
                className="h-16 rounded-full bg-primary px-12 text-xl font-bold text-primary-foreground transition-all hover:scale-105 hover:bg-primary/90"
              >
                <Link to="/login" search={{ tab: "signup" }}>
                  Start free
                  <ChevronRight className="ml-2 h-6 w-6" />
                </Link>
              </Button>

              <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> Free Demo plan
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> No credit card
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> Setup in 2 minutes
                </div>
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </MotionConfig>
  );
}
