import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";

import { ApiError, api, type AnalyzeResult, type SentimentLabel } from "@/lib/api";
import { SENTIMENT_TEXT } from "@/lib/format";
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
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const analyze = useMutation({
    mutationFn: () => api.analyze(text.trim()),
    onSuccess: (data) => setResult(data),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">Analyze Playground</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste any comment or message to see how BrandPulse reads it — sentiment, whether it is an
          actionable complaint, and which topic it belongs to.
        </p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Text to analyze</CardTitle>
            <CardDescription>English, Azerbaijani and Russian are supported.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="e.g. They charged me twice and won't refund it."
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
            <Button
              onClick={() => analyze.mutate()}
              disabled={!text.trim() || analyze.isPending}
            >
              {analyze.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Analyze
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {analyze.isError ? (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>
              {analyze.error instanceof ApiError ? analyze.error.message : "Analysis failed."}
            </AlertDescription>
          </Alert>
        ) : null}

        {result ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Sentiment</p>
                  <p className={`mt-1 text-lg font-semibold ${SENTIMENT_TONE[result.sentiment_label]}`}>
                    {SENTIMENT_TEXT[result.sentiment_label]}
                  </p>
                  <p className="text-numeric text-xs text-muted-foreground">
                    score {result.sentiment_score.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Complaint?</p>
                  <div className="mt-1">
                    {result.is_complaint ? (
                      <Badge variant="destructive">Actionable complaint</Badge>
                    ) : (
                      <Badge variant="secondary">Not a complaint</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Topic</p>
                  <p className="mt-1 text-sm font-medium">{result.topic}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Language</p>
                  <p className="mt-1 text-sm font-medium uppercase">{result.language}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
