import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Layers, MessagesSquare, Tag } from "lucide-react";

import { api, type PriorityTier, type ThreadStatus } from "@/lib/api";
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

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
];

const TIER_OPTIONS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "All tiers" },
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Critical", label: "Critical" },
];

const STATUS_CLASSES: Record<ThreadStatus, string> = {
  open: "border-risk-high/40 bg-risk-high/15 text-risk-high",
  investigating: "border-primary/40 bg-primary/15 text-primary",
  resolved: "border-risk-low/40 bg-risk-low/15 text-risk-low",
};

const STATUS_LABEL: Record<ThreadStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  resolved: "Resolved",
};

function StatusBadge({ status }: { status: ThreadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABEL[status]}
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
  const [status, setStatus] = useState<StatusFilter>("all");
  const [tier, setTier] = useState<TierFilter>("all");

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
              Incident Threads
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Near-duplicate complaints grouped into one incident.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tier} onValueChange={(value) => setTier(value as TierFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {TIER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
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
            <AlertTitle>Couldn't load incident threads</AlertTitle>
            <AlertDescription>
              {query.error instanceof Error ? query.error.message : "Please try again."}
            </AlertDescription>
          </Alert>
        ) : threads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Layers className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No incident threads yet — upload or paste mentions to start grouping complaints.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {formatNumber(threads.length)}{" "}
              {threads.length === 1 ? "thread" : "threads"} · newest first
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
                          {thread.topic}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessagesSquare className="h-3 w-3" />
                          {formatNumber(thread.mention_count)} mentions
                        </span>
                        <span>First seen {relativeTime(thread.first_seen)}</span>
                        <span>Last seen {relativeTime(thread.last_seen)}</span>
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
