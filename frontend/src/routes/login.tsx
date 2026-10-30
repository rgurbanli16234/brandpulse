import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Loader2 } from "lucide-react";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — BrandPulse" }] }),
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && session) navigate({ to: "/dashboard" });
  }, [ready, session, navigate]);

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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="relative hidden flex-col justify-between p-12 lg:flex"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">BrandPulse</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Brand Sentiment Monitoring
            </span>
          </span>
        </div>

        <div className="max-w-lg">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Know what your customers are saying — and which complaints matter.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            BrandPulse reads public mentions, scores sentiment in English, Azerbaijani and Russian,
            separates real complaints from noise, and groups repeated issues into a single incident you
            can act on.
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Prototype for small and medium businesses. Analysis is illustrative.
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <span className="text-lg font-bold tracking-tight">BrandPulse</span>
          </div>

          <Tabs value={mode} onValueChange={(value) => setMode(value as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@business.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-business">Business name</Label>
                  <Input
                    id="signup-business"
                    required
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder="Kofe Evi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@business.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-alert">Alert email (optional)</Label>
                  <Input
                    id="signup-alert"
                    type="email"
                    value={alertEmail}
                    onChange={(event) => setAlertEmail(event.target.value)}
                    placeholder="alerts@business.com"
                  />
                </div>
                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Your account is scoped to a single business. Analysis runs on your own data.
          </p>
        </div>
      </div>
    </div>
  );
}
