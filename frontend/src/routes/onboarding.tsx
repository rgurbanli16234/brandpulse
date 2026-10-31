import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ApiError, api, type KeywordType } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { KEYWORD_TYPE_KEYS } from "@/lib/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Set up — BrandPulse" }] }),
  component: OnboardingPage,
});

const KEYWORD_TYPES: KeywordType[] = ["brand", "product", "executive", "typo", "competitor"];

function OnboardingPage() {
  const { t } = useTranslation(["auth", "common"]);
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [type, setType] = useState<KeywordType>("brand");

  useEffect(() => {
    if (ready && !session) navigate({ to: "/login" });
  }, [ready, session, navigate]);

  const keywords = useQuery({
    queryKey: ["keywords"],
    queryFn: () => api.keywords(),
    enabled: Boolean(session),
  });

  const addKeyword = useMutation({
    mutationFn: () => api.createKeyword({ term: term.trim(), type }),
    onSuccess: () => {
      setTerm("");
      void queryClient.invalidateQueries({ queryKey: ["keywords"] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t("auth:onboarding.errors.addKeyword")),
  });

  const removeKeyword = useMutation({
    mutationFn: (id: number) => api.deleteKeyword(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["keywords"] }),
  });

  const seed = useMutation({
    mutationFn: () => api.seedDemo(),
    onSuccess: (result) => {
      toast.success(
        result.mentions_created > 0
          ? t("auth:onboarding.demo.loaded", { count: result.mentions_created })
          : t("auth:onboarding.demo.alreadyLoaded"),
      );
      void queryClient.invalidateQueries();
      navigate({ to: "/dashboard" });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t("auth:onboarding.demo.error")),
  });

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-8">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Activity className="h-4 w-4" />
        </span>
        <span className="text-[15px] font-bold tracking-tight">BrandPulse</span>
        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("auth:onboarding.welcome", { business: session.business.name })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("auth:onboarding.intro")}</p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t("auth:onboarding.keywords.title")}</CardTitle>
            <CardDescription>{t("auth:onboarding.keywords.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                if (term.trim()) addKeyword.mutate();
              }}
            >
              <div className="flex-1 space-y-2">
                <Label htmlFor="keyword">{t("auth:onboarding.keywords.label")}</Label>
                <Input
                  id="keyword"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder={t("auth:onboarding.keywords.placeholder")}
                />
              </div>
              <div className="w-full space-y-2 sm:w-40">
                <Label>{t("auth:onboarding.keywords.typeLabel")}</Label>
                <Select value={type} onValueChange={(value) => setType(value as KeywordType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KEYWORD_TYPES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(`common:${KEYWORD_TYPE_KEYS[option]}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={!term.trim() || addKeyword.isPending}>
                <Plus className="h-4 w-4" /> {t("auth:onboarding.keywords.add")}
              </Button>
            </form>

            {keywords.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("auth:onboarding.keywords.loading")}</p>
            ) : keywords.data && keywords.data.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {keywords.data.map((keyword) => (
                  <Badge key={keyword.id} variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1.5">
                    <span>{keyword.term}</span>
                    <span className="text-muted-foreground">
                      · {t(`common:${KEYWORD_TYPE_KEYS[keyword.type]}`)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeKeyword.mutate(keyword.id)}
                      aria-label={t("auth:onboarding.keywords.remove", { term: keyword.term })}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("auth:onboarding.keywords.empty")}</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("auth:onboarding.demo.title")}</CardTitle>
            <CardDescription>{t("auth:onboarding.demo.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => seed.mutate()} disabled={seed.isPending}>
              {seed.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> {t("auth:onboarding.demo.load")}
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
              {t("auth:onboarding.demo.skip")}
            </Button>
          </CardContent>
        </Card>

        {seed.isError ? (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>
              {seed.error instanceof ApiError ? seed.error.message : t("auth:onboarding.demo.error")}
            </AlertDescription>
          </Alert>
        ) : null}
      </main>
    </div>
  );
}
