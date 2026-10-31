import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Loader2, ArrowLeft, Star, Users, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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

/** The four value points shown on the branding panel. */
const POINT_KEYS = [
  "auth:login.hero.points.languages",
  "auth:login.hero.points.clustering",
  "auth:login.hero.points.priority",
  "auth:login.hero.points.privacy",
] as const;

function LoginPage() {
  const { t } = useTranslation(["auth", "pricing", "common"]);
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

  /** Turn an API failure into a message that names the actual problem. */
  const authErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.isNetworkError) return err.message;
      if (err.status === 401) return t("auth:login.errors.invalidCredentials");
      if (err.status === 409) return t("auth:login.errors.alreadyRegistered");
      if (err.status === 422) return t("auth:login.errors.invalidInput");
      // Remaining server messages are backend-generated and stay in their own language.
      return err.message;
    }
    return mode === "signup"
      ? t("auth:login.errors.genericSignup")
      : t("auth:login.errors.generic");
  };

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
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // The locale string carries a manual line break marker so each language decides
  // where the two-line stack falls.
  const [noteFirst, noteRest] = t("auth:login.hero.note").split("<br/>");

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2 bg-background selection:bg-primary selection:text-primary-foreground">
      <div className="absolute right-4 top-4 z-20">
        <LanguageSwitcher />
      </div>

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
                {t("auth:brand.tagline")}
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
              {t("auth:login.hero.badge")}
            </div>
            <h1 className="text-5xl font-serif leading-[1.1] tracking-tight mb-8">
              {t("auth:login.hero.title")}
            </h1>
            <ul className="space-y-4 mb-10">
              {POINT_KEYS.map((key, i) => (
                <motion.li 
                  key={key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3 text-foreground/70 text-sm font-medium"
                >
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  {t(key)}
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
            {noteFirst}
            <br />
            {noteRest}
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
              <h2 className="text-3xl font-serif mb-2">
                {mode === "signin" ? t("auth:login.modes.signin.title") : t("auth:login.modes.signup.title")}
              </h2>
              <p className="text-sm text-foreground/40 font-medium">
                {mode === "signin"
                  ? t("auth:login.modes.signin.body")
                  : t("auth:login.modes.signup.body")}
              </p>
              {mode === "signup" && selectedPlan && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-tint px-3 py-1.5 text-[11px] font-bold text-primary">
                  {t("auth:login.planSelected", {
                    plan: t(`pricing:plans.items.${selectedPlan.id}.name`),
                  })}
                </p>
              )}
            </div>

            <Tabs value={mode} onValueChange={(value) => setMode(value as "signin" | "signup")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-secondary-tint rounded-2xl p-1 h-12">
                <TabsTrigger value="signin" className="rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">{t("auth:login.tabs.signin")}</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">{t("auth:login.tabs.signup")}</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-business" className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">{t("auth:login.fields.businessName")}</Label>
                    <Input
                      id="signup-business"
                      required
                      className="rounded-xl h-12 bg-secondary-tint border-transparent focus:border-primary/20"
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      placeholder={t("auth:login.placeholders.businessName")}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">{t("auth:login.fields.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    className="rounded-xl h-12 bg-secondary-tint border-transparent focus:border-primary/20"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("auth:login.placeholders.email")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">{t("auth:login.fields.password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    className="rounded-xl h-12 bg-secondary-tint border-transparent focus:border-primary/20"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t("auth:login.placeholders.password")}
                  />
                </div>
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-alert" className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">{t("auth:login.fields.alertEmail")}</Label>
                    <Input
                      id="signup-alert"
                      type="email"
                      className="rounded-xl h-12 bg-secondary-tint border-transparent focus:border-primary/20"
                      value={alertEmail}
                      onChange={(event) => setAlertEmail(event.target.value)}
                      placeholder={t("auth:login.placeholders.alertEmail")}
                    />
                  </div>
                )}

                {error ? (
                  <Alert variant="destructive" className="rounded-xl bg-risk-critical/10 text-risk-critical border-none">
                    <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                  </Alert>
                ) : null}

                <Button type="submit" className="w-full h-14 rounded-full bg-primary text-primary-foreground text-lg font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (mode === "signin" ? t("auth:login.tabs.signin") : t("auth:login.tabs.signup"))}
                </Button>
              </form>
            </div>

            <div className="mt-8 pt-8 border-t border-border/50 text-center">
              <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-foreground/40 hover:text-primary transition-colors">
                <ArrowLeft className="h-3 w-3" /> {t("auth:login.backToLanding")}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
