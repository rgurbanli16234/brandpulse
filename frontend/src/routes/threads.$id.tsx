import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import {
  api,
  type Mention,
  type SentimentLabel,
  type ThreadDetail,
  type ThreadStatus,
} from "@/lib/api";
import {
  MENTION_LANGUAGE_KEYS,
  PRIORITY_KEYS,
  SENTIMENT_KEYS,
  SOURCE_KEYS,
  THREAD_STATUS_KEYS,
  topicKey,
} from "@/lib/enums";
import { formatDecimal, formatNumber } from "@/i18n/format";
import { relativeTime, SENTIMENT_COLORS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/threads/$id")({
  head: () => ({ meta: [{ title: "Incident Thread — BrandPulse" }] }),
  component: ThreadDetailPage,
});

const STATUS_CLASSES: Record<ThreadStatus, string> = {
  open: "border-risk-high/40 bg-risk-high/15 text-risk-high",
  investigating: "border-primary/40 bg-primary/15 text-primary",
  resolved: "border-risk-low/40 bg-risk-low/15 text-risk-low",
};

const FACTOR_ROWS = [
  { key: "severity", labelKey: "app:thread.breakdown.factors.severity", weight: 0.5 },
  { key: "reach", labelKey: "app:thread.breakdown.factors.reach", weight: 0.3 },
  { key: "velocity", labelKey: "app:thread.breakdown.factors.velocity", weight: 0.2 },
] as const;

const INPUT_ROWS = [
  { key: "mention_count", labelKey: "app:thread.breakdown.inputs.mentions" },
  { key: "raw_reach", labelKey: "app:thread.breakdown.inputs.rawReach" },
  { key: "recent_mentions_60m", labelKey: "app:thread.breakdown.inputs.mentions60m" },
  { key: "worst_negativity", labelKey: "app:thread.breakdown.inputs.worstNegativity" },
  { key: "topic_weight", labelKey: "app:thread.breakdown.inputs.topicWeight" },
] as const;

function StatusBadge({ status }: { status: ThreadStatus }) {
  const { t } = useTranslation("common");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_CLASSES[status],
      )}
    >
      {t(THREAD_STATUS_KEYS[status])}
    </span>
  );
}

function SentimentChip({ label }: { label: SentimentLabel | null }) {
  const { t } = useTranslation("common");

  if (!label) {
    return (
      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
        {t("labels.unscored")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-foreground">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: SENTIMENT_COLORS[label] }}
      />
      {t(SENTIMENT_KEYS[label])}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-numeric mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatInput(value: number | undefined): string {
  if (value === undefined) return "—";
  return Number.isInteger(value) ? formatNumber(value) : formatDecimal(value);
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-2/3" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

function MentionRow({ mention }: { mention: Mention }) {
  const { t } = useTranslation(["app", "common"]);

  /** Analyser/API values are rendered through their translated labels. */
  const sourceLabel = (value: string): string => {
    const key = SOURCE_KEYS[value as keyof typeof SOURCE_KEYS];
    return key ? t(`common:${key}`) : value;
  };
  const languageLabel = (value: string): string => {
    const key = MENTION_LANGUAGE_KEYS[value as keyof typeof MENTION_LANGUAGE_KEYS];
    return key ? t(`common:${key}`) : value;
  };

  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {mention.author ?? t("common:labels.unknownAuthor")}
        </span>
        <span>·</span>
        <span>{sourceLabel(mention.source)}</span>
        <span>·</span>
        <span>{relativeTime(mention.created_at)}</span>
        <SentimentChip label={mention.sentiment_label} />
        <span className="rounded bg-muted px-1.5 py-0.5 uppercase">
          {languageLabel(mention.language)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{mention.text}</p>
      {mention.url ? (
        <a
          href={mention.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> {t("app:thread.viewSource")}
        </a>
      ) : null}
    </div>
  );
}

function ThreadDetailPage() {
  const { id } = Route.useParams();
  const threadId = Number(id);
  const validId = Number.isFinite(threadId);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const { t } = useTranslation(["app", "common"]);

  /** Analyser topics come back as API values; the UI shows the translated label. */
  const topicLabel = (value: string | null | undefined): string => {
    const key = topicKey(value);
    return key ? t(`common:${key}`) : (value ?? "");
  };

  /** Priority tiers are API values too — the breakdown reports one as a raw string. */
  const priorityLabel = (value: string): string => {
    const key = PRIORITY_KEYS[value as keyof typeof PRIORITY_KEYS];
    return key ? t(`common:${key}`) : value;
  };

  const query = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => api.thread(threadId),
    enabled: validId,
  });

  const statusMutation = useMutation({
    mutationFn: (status: ThreadStatus) => api.updateThreadStatus(threadId, status),
    onSuccess: () => {
      toast.success(t("app:thread.toasts.statusUpdated"));
      void queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
      void queryClient.invalidateQueries({ queryKey: ["threads"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : t("app:thread.toasts.statusFailed"));
    },
  });

  /** Local template, rebuilt in the active language. */
  const buildResponseDraft = (thread: ThreadDetail): string =>
    [
      t("app:thread.draft.paragraph1", {
        count: thread.mention_count,
        topic: topicLabel(thread.topic),
      }),
      "",
      t("app:thread.draft.paragraph2"),
      "",
      t("app:thread.draft.paragraph3"),
    ].join("\n");

  const detail = query.data;
  const defaultDraft = detail ? buildResponseDraft(detail) : "";

  useEffect(() => {
    if (defaultDraft) setDraft(defaultDraft);
  }, [defaultDraft]);

  function handleCopy() {
    if (!navigator.clipboard) {
      toast.error(t("app:thread.toasts.clipboardUnavailable"));
      return;
    }
    void navigator.clipboard
      .writeText(draft)
      .then(() => toast.success(t("app:thread.toasts.copied")))
      .catch(() => toast.error(t("app:thread.toasts.copyFailed")));
  }

  const breakdown = detail?.score_breakdown ?? null;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          to="/threads"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("app:thread.backToAll")}
        </Link>

        {!validId ? (
          <Alert variant="destructive">
            <AlertTitle>{t("app:thread.invalidTitle")}</AlertTitle>
            <AlertDescription>{t("app:thread.invalidBody")}</AlertDescription>
          </Alert>
        ) : query.isLoading ? (
          <DetailSkeleton />
        ) : query.isError ? (
          <Alert variant="destructive">
            <AlertTitle>{t("app:thread.loadErrorTitle")}</AlertTitle>
            <AlertDescription>
              {query.error instanceof Error ? query.error.message : t("app:thread.fallback")}
            </AlertDescription>
          </Alert>
        ) : !detail ? (
          <Alert>
            <AlertTitle>{t("app:thread.notFoundTitle")}</AlertTitle>
            <AlertDescription>{t("app:thread.notFoundBody")}</AlertDescription>
          </Alert>
        ) : (
          <>
            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge tier={detail.priority_tier} />
                  <StatusBadge status={detail.status} />
                  <span className="text-xs text-muted-foreground">{topicLabel(detail.topic)}</span>
                </div>
                <CardTitle className="text-xl">{detail.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat
                  label={t("app:thread.stats.mentions")}
                  value={formatNumber(detail.mention_count)}
                />
                <Stat
                  label={t("app:thread.stats.priorityScore")}
                  value={detail.priority_score != null ? formatDecimal(detail.priority_score, 3) : "—"}
                />
                <Stat
                  label={t("app:thread.stats.firstSeen")}
                  value={relativeTime(detail.first_seen)}
                />
                <Stat
                  label={t("app:thread.stats.lastSeen")}
                  value={relativeTime(detail.last_seen)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("app:thread.breakdown.title")}</CardTitle>
                <CardDescription>
                  {breakdown
                    ? t("app:thread.breakdown.formula", {
                        score: formatDecimal(breakdown.score, 3),
                        tier: priorityLabel(breakdown.tier),
                      })
                    : t("app:thread.breakdown.unavailable")}
                </CardDescription>
              </CardHeader>
              {breakdown ? (
                <CardContent className="space-y-4">
                  {FACTOR_ROWS.map((row) => {
                    const factor = breakdown.factors[row.key];
                    const weight = breakdown.weights[row.key] ?? row.weight;
                    return (
                      <div key={row.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">
                            {t(row.labelKey)}{" "}
                            <span className="text-muted-foreground">
                              {t("app:thread.breakdown.weight", {
                                weight: formatDecimal(weight, 1),
                              })}
                            </span>
                          </span>
                          <span className="text-numeric text-muted-foreground">
                            {formatNumber(Math.round(factor * 100))}%
                          </span>
                        </div>
                        <Progress value={Math.round(factor * 100)} />
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {INPUT_ROWS.map((row) => (
                      <Stat
                        key={row.key}
                        label={t(row.labelKey)}
                        value={formatInput(breakdown.inputs[row.key])}
                      />
                    ))}
                  </div>
                </CardContent>
              ) : null}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("app:thread.status.title")}</CardTitle>
                <CardDescription>{t("app:thread.status.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Select
                  value={detail.status}
                  onValueChange={(value) => statusMutation.mutate(value as ThreadStatus)}
                  disabled={statusMutation.isPending}
                >
                  <SelectTrigger className="w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t(`common:${THREAD_STATUS_KEYS.open}`)}</SelectItem>
                    <SelectItem value="investigating">
                      {t(`common:${THREAD_STATUS_KEYS.investigating}`)}
                    </SelectItem>
                    <SelectItem value="resolved">
                      {t(`common:${THREAD_STATUS_KEYS.resolved}`)}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  {statusMutation.isPending
                    ? t("app:thread.status.updating")
                    : t("app:thread.status.applied")}
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("app:thread.grouped.title", { count: detail.mentions.length })}
                </CardTitle>
                <CardDescription>{t("app:thread.grouped.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.mentions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("app:thread.grouped.empty")}</p>
                ) : (
                  detail.mentions.map((mention) => <MentionRow key={mention.id} mention={mention} />)
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("app:thread.draft.title")}</CardTitle>
                <CardDescription>{t("app:thread.draft.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="min-h-[140px]"
                />
                <div className="flex justify-end">
                  <Button variant="outline" className="gap-2" onClick={handleCopy}>
                    <Copy className="h-4 w-4" /> {t("common:actions.copy")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
