import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ApiError, api, type AnalyzeResult, type SentimentLabel } from "@/lib/api";
import { MENTION_LANGUAGE_KEYS, SENTIMENT_KEYS, topicKey } from "@/lib/enums";
import { formatDecimal } from "@/i18n/format";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/playground")({
  head: () => ({ meta: [{ title: "Analyze Playground — BrandPulse" }] }),
  component: PlaygroundPage,
});

/** Sample texts stay in the language they were written in. */
const EXAMPLES = [
  "They double charged my card and support refuses to refund my money. Terrible service!",
  "The store was busy today but the staff was friendly.",
  "Tətbiq yenə işləmir, sifariş səhifəsi açılmır.",
  "Ужасно! Заказ не пришёл, деньги не вернули.",
];

const SENTIMENT_TONE: Record<SentimentLabel, string> = {
  positive: "text-risk-low",
  neutral: "text-muted-foreground",
  negative: "text-risk-high",
  strongly_negative: "text-risk-critical",
};

function PlaygroundPage() {
  const { t } = useTranslation(["app", "common"]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const analyze = useMutation({
    mutationFn: () => api.analyze(text.trim()),
    onSuccess: (data) => setResult(data),
  });

  /** Analyser output is an API value; the UI shows the translated label. */
  const topicLabel = (value: string | null): string => {
    const key = topicKey(value);
    return key ? t(`common:${key}`) : (value ?? "");
  };

  const languageLabel = (value: string): string => {
    const key = MENTION_LANGUAGE_KEYS[value as keyof typeof MENTION_LANGUAGE_KEYS];
    return key ? t(`common:${key}`) : value;
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">{t("app:playground.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("app:playground.subtitle")}</p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("app:playground.card.title")}</CardTitle>
            <CardDescription>{t("app:playground.card.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={5}
              maxLength={5000}
              placeholder={t("app:playground.card.placeholder")}
            />
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setText(example)}
                  className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {example.length > 42 ? `${example.slice(0, 42)}…` : example}
                </button>
              ))}
            </div>
            <Button onClick={() => analyze.mutate()} disabled={!text.trim() || analyze.isPending}>
              {analyze.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> {t("app:playground.card.analyze")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {analyze.isError ? (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>
              {analyze.error instanceof ApiError ? analyze.error.message : t("app:playground.error")}
            </AlertDescription>
          </Alert>
        ) : null}

        {result ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t("app:playground.result.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("app:playground.result.sentiment")}
                  </p>
                  <p className={`mt-1 text-lg font-semibold ${SENTIMENT_TONE[result.sentiment_label]}`}>
                    {t(`common:${SENTIMENT_KEYS[result.sentiment_label]}`)}
                  </p>
                  <p className="text-numeric text-xs text-muted-foreground">
                    {t("app:playground.result.score", {
                      score: formatDecimal(result.sentiment_score),
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("app:playground.result.complaintQuestion")}
                  </p>
                  <div className="mt-1">
                    {result.is_complaint ? (
                      <Badge variant="destructive">{t("app:playground.result.actionable")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("app:playground.result.notComplaint")}</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("app:playground.result.topic")}
                  </p>
                  <p className="mt-1 text-sm font-medium">{topicLabel(result.topic)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("app:playground.result.language")}
                  </p>
                  <p className="mt-1 text-sm font-medium">{languageLabel(result.language)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
