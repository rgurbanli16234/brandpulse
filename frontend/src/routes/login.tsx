import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Loader2, ArrowLeft, Star, Users, Check } from "lucide-react";
import { motion } from "framer-motion";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — BrandPulse" }] }),
  // Lets the marketing pages open the right tab: /login?tab=signup&plan=pro
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: "signin" | "signup"; plan?: string } => {
    const rawTab = search["tab"];
    const tab = rawTab === "signup" ? "signup" : rawTab === "signin" ? "signin" : undefined;
    const rawPlan = search["plan"];
    return {
      ...(tab ? { tab } : {}),
      ...(typeof rawPlan === "string" ? { plan: rawPlan } : {}),
    };
  },
  component: LoginPage,
});

/** Turn an API failure into a message that names the actual problem. */
function authErrorMessage(error: unknown, mode: "signin" | "signup"): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return error.message;
    if (error.status === 401) return "Incorrect email or password.";
    if (error.status === 409) {
      return "That email is already registered. Try signing in instead.";
    }
    if (error.status === 422) return "Please check the email and password you entered.";
    return error.message;
  }
  return `Something went wrong${mode === "signup" ? " creating your account" : ""}. Please try again.`;
}

function LoginPage() {
  const { session, ready, login, register } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.tab ?? "signin");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Set by the pricing CTAs (/login?tab=signup&plan=pro).
  const selectedPlan = search.plan ? PLANS.find((plan) => plan.id === search.plan) : undefined;

  useEffect(() => {
    if (ready && session) navigate({ to: "/dashboard" });
  }, [ready, session, navigate]);

  // Keep the tab in sync when a link is clicked while already on /login.
  useEffect(() => {
    if (search.tab) setMode(search.tab);
  }, [search.tab]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await login(email, password);
        navigate({ to: "/dashboard" });
      } else {
        await register({
          business_name: businessName,
          email,
          password,
          ...(alertEmail.trim() ? { alert_email: alertEmail.trim() } : {}),
        });
        navigate({ to: "/onboarding" });
      }
    } catch (err) {
      setError(authErrorMessage(err, mode));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-background selection:bg-primary selection:text-primary-foreground">
      {/* Left Panel: Branding & Value Prop */}
      <div
        className="relative hidden flex-col justify-between p-12 lg:flex overflow-hidden"
        style={{ background: "var(--background)" }}
      >
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
             style={{ backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative z-10"
        >
          <Link to="/" className="flex items-center gap-3 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-110">
              <Activity className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xl font-bold tracking-tight">BrandPulse</span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-foreground/40 font-bold mt-0.5">
                Sentiment Monitoring
              </span>
            </span>
          </Link>
        </motion.div>

        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-8">
              <Star className="h-3 w-3 text-primary fill-primary" />
              Built for small and medium businesses
            </div>
            <h1 className="text-5xl font-serif leading-[1.1] tracking-tight mb-8">
              Know what your customers are saying — and which complaints matter.
            </h1>
            <ul className="space-y-4 mb-10">
              {[
                "Multi-language support (EN, AZ, RU)",
                "AI-powered incident clustering",
                "Real-time sentiment priority scoring",
                "Privacy-first data handling"
              ].map((text, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3 text-foreground/70 text-sm font-medium"
                >
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  {text}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative z-10 flex items-center gap-4"
        >
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden">
                <Users className="h-4 w-4 text-foreground/40" />
              </div>
            ))}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/30 leading-relaxed">
            PROTOTYPE FOR SMALL BUSINESSES.<br />ANALYSIS IS ILLUSTRATIVE.
          </p>
        </motion.div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="flex flex-col items-center justify-center px-6 py-12 bg-card lg:bg-background border-l border-border/50">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex justify-center">
            <Link to="/" className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold tracking-tight">BrandPulse</span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="mb-8">
              <h2 className="text-3xl font-serif mb-2">{mode === "signin" ? "Welcome back" : "Get started"}</h2>
              <p className="text-sm text-foreground/40 font-medium">
                {mode === "signin" 
                  ? "Enter your credentials to access your dashboard." 
                  : "Create an account to start monitoring your brand."}
              </p>
              {mode === "signup" && selectedPlan && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-tint px-3 py-1.5 text-[11px] font-bold text-primary">
                  {selectedPlan.name} plan selected — trial, no payment
                </p>
              )}
            </div>

            <Tabs value={mode} onValueChange={(value) => setMode(value as "signin" | "signup")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-secondary-tint rounded-2xl p-1 h-12">
                <TabsTrigger value="signin" className="rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Create account</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-business" className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Business name</Label>
                    <Input
                      id="signup-business"
                      required
                      className="rounded-xl h-12 bg-secondary-tint border-transparent focus:border-primary/20"
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      placeholder="Kofe Evi"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    className="rounded-xl h-12 bg-secondary-tint border-transparent focus:border-primary/20"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@business.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    className="rounded-xl h-12 bg-secondary-tint border-transparent focus:border-primary/20"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-alert" className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Alert email (optional)</Label>
                    <Input
                      id="signup-alert"
                      type="email"
                      className="rounded-xl h-12 bg-secondary-tint border-transparent focus:border-primary/20"
                      value={alertEmail}
                      onChange={(event) => setAlertEmail(event.target.value)}
                      placeholder="alerts@business.com"
                    />
                  </div>
                )}

                {error ? (
                  <Alert variant="destructive" className="rounded-xl bg-risk-critical/10 text-risk-critical border-none">
                    <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                  </Alert>
                ) : null}

                <Button type="submit" className="w-full h-14 rounded-full bg-primary text-primary-foreground text-lg font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (mode === "signin" ? "Sign in" : "Create account")}
                </Button>
              </form>
            </div>

            <div className="mt-8 pt-8 border-t border-border/50 text-center">
              <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-foreground/40 hover:text-primary transition-colors">
                <ArrowLeft className="h-3 w-3" /> Back to landing page
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
