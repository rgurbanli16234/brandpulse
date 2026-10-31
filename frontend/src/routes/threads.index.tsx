import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Layers, MessagesSquare, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

import { api, type PriorityTier, type ThreadStatus } from "@/lib/api";
import { PRIORITY_KEYS, THREAD_STATUS_KEYS, topicKey } from "@/lib/enums";
import { formatNumber, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/threads/")({
  head: () => ({ meta: [{ title: "Incident Threads — BrandPulse" }] }),
  component: ThreadsPage,
});

type StatusFilter = "all" | ThreadStatus;
type TierFilter = "all" | PriorityTier;

const STATUS_OPTIONS = [
  { value: "all", labelKey: "app:threads.allStatuses" },
  { value: "open", labelKey: `common:${THREAD_STATUS_KEYS.open}` },
  { value: "investigating", labelKey: `common:${THREAD_STATUS_KEYS.investigating}` },
  { value: "resolved", labelKey: `common:${THREAD_STATUS_KEYS.resolved}` },
] as const satisfies ReadonlyArray<{ value: StatusFilter; labelKey: string }>;

const TIER_OPTIONS = [
  { value: "all", labelKey: "app:threads.allTiers" },
  { value: "Low", labelKey: `common:${PRIORITY_KEYS.Low}` },
  { value: "Medium", labelKey: `common:${PRIORITY_KEYS.Medium}` },
  { value: "High", labelKey: `common:${PRIORITY_KEYS.High}` },
  { value: "Critical", labelKey: `common:${PRIORITY_KEYS.Critical}` },
] as const satisfies ReadonlyArray<{ value: TierFilter; labelKey: string }>;

const STATUS_CLASSES: Record<ThreadStatus, string> = {
  open: "border-risk-high/40 bg-risk-high/15 text-risk-high",
  investigating: "border-primary/40 bg-primary/15 text-primary",
  resolved: "border-risk-low/40 bg-risk-low/15 text-risk-low",
};

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

function ThreadRowSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="w-full space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="h-6 w-24" />
      </CardContent>
    </Card>
  );
}

function ThreadsPage() {
  const { t } = useTranslation(["app", "common"]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [tier, setTier] = useState<TierFilter>("all");

  /** Analyser topics come back as API values; the UI shows the translated label. */
  const topicLabel = (value: string): string => {
    const key = topicKey(value);
    return key ? t(`common:${key}`) : value;
  };

  const filters: { status?: string; tier?: string } = {};
  if (status !== "all") filters.status = status;
  if (tier !== "all") filters.tier = tier;

  const query = useQuery({
    queryKey: ["threads", status, tier],
    queryFn: () => api.threads(filters),
  });

  const threads = query.data ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("app:threads.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("app:threads.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder={t("app:threads.statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tier} onValueChange={(value) => setTier(value as TierFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("app:threads.priorityPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {TIER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {query.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((index) => (
              <ThreadRowSkeleton key={index} />
            ))}
          </div>
        ) : query.isError ? (
          <Alert variant="destructive">
            <AlertTitle>{t("app:threads.errors.loadTitle")}</AlertTitle>
            <AlertDescription>
              {query.error instanceof Error ? query.error.message : t("app:threads.errors.fallback")}
            </AlertDescription>
          </Alert>
        ) : threads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Layers className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("app:threads.empty")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("app:threads.count", { count: threads.length })}
            </p>
            {threads.map((thread) => (
              <Link
                key={thread.id}
                to="/threads/$id"
                params={{ id: String(thread.id) }}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="transition-colors hover:border-primary/50 hover:bg-accent/30">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <PriorityBadge tier={thread.priority_tier} />
                        <span className="truncate font-medium text-foreground">
                          {thread.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {topicLabel(thread.topic)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessagesSquare className="h-3 w-3" />
                          {t("common:counts.mentions", { count: thread.mention_count })}
                        </span>
                        <span>
                          {t("app:threads.firstSeen", { time: relativeTime(thread.first_seen) })}
                        </span>
                        <span>
                          {t("app:threads.lastSeen", { time: relativeTime(thread.last_seen) })}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={thread.status} />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
