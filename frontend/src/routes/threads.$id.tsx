import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import {
  api,
  type Mention,
  type SentimentLabel,
  type ThreadDetail,
  type ThreadStatus,
} from "@/lib/api";
import { formatNumber, relativeTime, SENTIMENT_COLORS, SENTIMENT_TEXT } from "@/lib/format";
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

const STATUS_LABEL: Record<ThreadStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  resolved: "Resolved",
};

const FACTOR_ROWS: { key: "severity" | "reach" | "velocity"; label: string; weight: number }[] = [
  { key: "severity", label: "Severity", weight: 0.5 },
  { key: "reach", label: "Reach", weight: 0.3 },
  { key: "velocity", label: "Velocity", weight: 0.2 },
];

const INPUT_ROWS: { key: string; label: string }[] = [
  { key: "mention_count", label: "Mentions" },
  { key: "raw_reach", label: "Raw reach" },
  { key: "recent_mentions_60m", label: "Mentions (60m)" },
  { key: "worst_negativity", label: "Worst negativity" },
  { key: "topic_weight", label: "Topic weight" },
];

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

function SentimentChip({ label }: { label: SentimentLabel | null }) {
  if (!label) {
    return <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">Unscored</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-foreground">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: SENTIMENT_COLORS[label] }}
      />
      {SENTIMENT_TEXT[label]}
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
  return Number.isInteger(value) ? formatNumber(value) : value.toFixed(2);
}

function buildResponseDraft(thread: ThreadDetail): string {
  const count = formatNumber(thread.mention_count);
  const noun = thread.mention_count === 1 ? "report" : "reports";
  return [
    `Hi — thanks for flagging this. We've seen ${count} similar ${noun} about "${thread.topic}" and we're taking it seriously.`,
    "",
    "Our team is already investigating this issue. While we work on a fix, please reach out to support@brandpulse.app with your account details and we'll make it right.",
    "",
    "We'll post an update here as soon as we have one.",
  ].join("\n");
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
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{mention.author ?? "Unknown author"}</span>
        <span>·</span>
        <span>{mention.source}</span>
        <span>·</span>
        <span>{relativeTime(mention.created_at)}</span>
        <SentimentChip label={mention.sentiment_label} />
        <span className="rounded bg-muted px-1.5 py-0.5 uppercase">{mention.language}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{mention.text}</p>
      {mention.url ? (
        <a
          href={mention.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> View source
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

  const query = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => api.thread(threadId),
    enabled: validId,
  });

  const statusMutation = useMutation({
    mutationFn: (status: ThreadStatus) => api.updateThreadStatus(threadId, status),
    onSuccess: () => {
      toast.success("Thread status updated");
      void queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
      void queryClient.invalidateQueries({ queryKey: ["threads"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Could not update status");
    },
  });

  const detail = query.data;
  const defaultDraft = detail ? buildResponseDraft(detail) : "";

  useEffect(() => {
    if (defaultDraft) setDraft(defaultDraft);
  }, [defaultDraft]);

  function handleCopy() {
    if (!navigator.clipboard) {
      toast.error("Clipboard unavailable in this browser");
      return;
    }
    void navigator.clipboard
      .writeText(draft)
      .then(() => toast.success("Draft copied to clipboard"))
      .catch(() => toast.error("Could not copy to clipboard"));
  }

  const breakdown = detail?.score_breakdown ?? null;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          to="/threads"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All incident threads
        </Link>

        {!validId ? (
          <Alert variant="destructive">
            <AlertTitle>Invalid thread</AlertTitle>
            <AlertDescription>The incident thread id in the URL is not valid.</AlertDescription>
          </Alert>
        ) : query.isLoading ? (
          <DetailSkeleton />
        ) : query.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Couldn't load this thread</AlertTitle>
            <AlertDescription>
              {query.error instanceof Error ? query.error.message : "Please try again."}
            </AlertDescription>
          </Alert>
        ) : !detail ? (
          <Alert>
            <AlertTitle>Thread not found</AlertTitle>
            <AlertDescription>
              This incident thread no longer exists or is not available.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge tier={detail.priority_tier} />
                  <StatusBadge status={detail.status} />
                  <span className="text-xs text-muted-foreground">{detail.topic}</span>
                </div>
                <CardTitle className="text-xl">{detail.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Mentions" value={formatNumber(detail.mention_count)} />
                <Stat
                  label="Priority score"
                  value={detail.priority_score != null ? detail.priority_score.toFixed(3) : "—"}
                />
                <Stat label="First seen" value={relativeTime(detail.first_seen)} />
                <Stat label="Last seen" value={relativeTime(detail.last_seen)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Why this priority</CardTitle>
                <CardDescription>
                  {breakdown
                    ? `Score ${breakdown.score.toFixed(3)} · Tier ${breakdown.tier} · formula 0.5 × severity + 0.3 × reach + 0.2 × velocity`
                    : "No score breakdown is available for this thread yet."}
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
                            {row.label} <span className="text-muted-foreground">· weight {weight}</span>
                          </span>
                          <span className="text-numeric text-muted-foreground">
                            {Math.round(factor * 100)}%
                          </span>
                        </div>
                        <Progress value={Math.round(factor * 100)} />
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {INPUT_ROWS.map((row) => (
                      <Stat key={row.key} label={row.label} value={formatInput(breakdown.inputs[row.key])} />
                    ))}
                  </div>
                </CardContent>
              ) : null}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
                <CardDescription>Update the incident thread state.</CardDescription>
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
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  {statusMutation.isPending ? "Updating…" : "Changes apply immediately."}
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Grouped mentions ({formatNumber(detail.mentions.length)})
                </CardTitle>
                <CardDescription>Every complaint grouped into this thread.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.mentions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No mentions are grouped into this thread yet.
                  </p>
                ) : (
                  detail.mentions.map((mention) => <MentionRow key={mention.id} mention={mention} />)
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Suggested response draft</CardTitle>
                <CardDescription>
                  A local template based on this thread — edit it before posting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="min-h-[140px]"
                />
                <div className="flex justify-end">
                  <Button variant="outline" className="gap-2" onClick={handleCopy}>
                    <Copy className="h-4 w-4" /> Copy
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
