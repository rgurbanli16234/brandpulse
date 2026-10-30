import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BrandPulse — Brand Sentiment & Complaint Monitoring" },
      {
        name: "description",
        content:
          "BrandPulse separates urgent complaints from everyday chatter, groups related problems, and tells you what needs attention now.",
      },
    ],
  }),
  component: LandingPage,
});

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

function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-8 md:px-12">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 bg-primary" />
          <span className="text-lg font-bold tracking-tight">BrandPulse</span>
        </div>
        <div className="flex items-center gap-8">
          <Link
            to="/login"
            className="text-sm font-medium transition-opacity hover:opacity-70"
          >
            Sign in
          </Link>
          <Button
            variant="outline"
            asChild
            className="rounded-none border-foreground px-6 font-medium hover:bg-foreground hover:text-background"
          >
            <Link to="/login">Start Listening</Link>
          </Button>
        </div>
      </nav>

      <main className="grid min-h-[calc(100vh-100px)] grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left Side: Hero */}
        <div className="flex flex-col justify-center px-8 py-20 md:px-12 lg:py-0">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              A CALMER WAY TO HEAR THE INTERNET
            </span>
            <h1 className="mt-8 font-serif text-[clamp(3.5rem,8vw,5.5rem)] leading-[0.9] tracking-[-0.03em]">
              Your customers are talking. Here's what they said.
            </h1>
            <div className="mt-8 h-px w-32 bg-primary/30" />
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-foreground/70">
              BrandPulse separates urgent complaints from everyday chatter, groups related problems,
              and tells you what needs attention now.
            </p>
            <div className="mt-12 flex items-center gap-6">
              <Button
                size="lg"
                asChild
                className="group h-14 rounded-none bg-primary px-8 text-lg font-medium transition-transform active:scale-95"
              >
                <Link to="/login">
                  Start listening
                  <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40">
                BUILT FOR SMALL TEAMS
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Visual Proof */}
        <div className="relative flex items-center justify-center bg-secondary/30 p-8 lg:p-12">
          {/* Decorative background element */}
          <div className="absolute inset-0 bg-secondary opacity-50" />

          {/* Card Container */}
          <div className="relative w-full max-w-md bg-card shadow-[24px_24px_0px_oklch(var(--secondary))]">
            <div className="border-b border-border/50 p-6">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40">
                LIVE DESK / QALA COFFEE
              </span>
            </div>

            <div className="p-8">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-6xl font-medium tracking-tighter">3 complaints</span>
              </div>
              <p className="mt-1 text-lg font-medium opacity-60">need you today</p>

              <div className="mt-12">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/30">
                  <span>CUSTOMER MOOD / LAST 14 DAYS</span>
                </div>
                <div className="mt-6 h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={MOCK_CHART_DATA}>
                      <Line
                        type="monotone"
                        dataKey="mood"
                        stroke="oklch(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/30">
                  14 DAYS AGO
                </div>
              </div>

              <div className="mt-12 space-y-px border-t border-border/50">
                {[
                  "Customers charged twice at checkout",
                  "Courier orders arriving late",
                  "Checkout freezes after discount code",
                ].map((complaint, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-6 border-b border-border/50 py-4 text-sm font-medium"
                  >
                    <span className="text-[10px] font-bold tabular-nums tracking-widest text-foreground/30">
                      0{i + 1}
                    </span>
                    <span>{complaint}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Bottom Accent */}
            <div className="h-3 w-full bg-secondary" />
          </div>
        </div>
      </main>

      {/* Footer (Simplified for this design) */}
      <footer className="border-t border-border/30 px-8 py-8 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/20 md:px-12">
        BRANDPULSE PROTOTYPE &copy; 2026
      </footer>
    </div>
  );
}

