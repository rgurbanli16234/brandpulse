import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BellRing,
  Flame,
  Layers,
  MessageSquare,
  Smile,
  TrendingDown,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/AppShell";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, describeError } from "@/lib/api";
import { formatNumber, relativeTime, SENTIMENT_COLORS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BrandPulse" }] }),
  component: DashboardPage,
});

const TOPIC_BAR_COLORS = [
  "var(--risk-critical)",
  "var(--risk-high)",
  "var(--risk-medium)",
  "var(--risk-low)",
  "var(--primary)",
  "var(--risk-medium)",
  "var(--risk-high)",
  "var(--muted-foreground)",
] as const;

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "0.75rem",
  color: "var(--popover-foreground)",
} as const;

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-numeric mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted", tone)}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function ErrorNote({ title, description }: { title: string; description: string }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}

function EmptyNote({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" asChild>
        <Link to="/mentions">Add mentions</Link>
      </Button>
    </div>
  );
}

function DashboardPage() {
  const summary = useQuery({ queryKey: ["summary"], queryFn: () => api.summary() });
  const spikes = useQuery({ queryKey: ["spikes"], queryFn: () => api.spikes() });
  const trend = useQuery({
    queryKey: ["sentiment-trend", 14],
    queryFn: () => api.sentimentTrend(14),
  });
  const topics = useQuery({ queryKey: ["topics"], queryFn: () => api.topics() });
  const threads = useQuery({
    queryKey: ["threads", { limit: 6 }],
    queryFn: () => api.threads({ limit: 6 }),
  });

  const detectedSpikes = (spikes.data?.spikes ?? []).filter((s) => s.detected);
  const highPriorityThreads = (threads.data ?? []).filter(
    (t) => t.priority_tier === "High" || t.priority_tier === "Critical",
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A live overview of what people are saying about your brand.
          </p>
        </div>

        {summary.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : summary.isError ? (
          <ErrorNote
            title="Couldn't load your numbers"
            description={describeError(summary.error, "The summary is unavailable right now.")}
          />
        ) : summary.data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total mentions"
              value={formatNumber(summary.data.total_mentions)}
              icon={MessageSquare}
              tone="text-primary"
            />
            <KpiCard
              label="Mentions (24h)"
              value={formatNumber(summary.data.mentions_24h)}
              icon={Activity}
              tone="text-primary"
            />
            <KpiCard
              label="Complaints"
              value={formatNumber(summary.data.complaints)}
              icon={TrendingDown}
              tone="text-risk-critical"
            />
            <KpiCard
              label="Open threads"
              value={formatNumber(summary.data.open_threads)}
              icon={Layers}
              tone="text-muted-foreground"
            />
            <KpiCard
              label="High priority"
              value={formatNumber(summary.data.high_threads)}
              icon={Flame}
              tone="text-risk-high"
            />
            <KpiCard
              label="Critical priority"
              value={formatNumber(summary.data.critical_threads)}
              icon={AlertOctagon}
              tone="text-risk-critical"
            />
            <KpiCard
              label="Unacknowledged alerts"
              value={formatNumber(summary.data.unacknowledged_alerts)}
              icon={BellRing}
              tone="text-risk-critical"
            />
            <KpiCard
              label="Avg sentiment"
              value={summary.data.avg_sentiment.toFixed(2)}
              icon={Smile}
              tone="text-risk-low"
            />
          </div>
        ) : null}

        {spikes.isSuccess && detectedSpikes.length > 0 ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unusual activity in the last 24 hours</AlertTitle>
            <AlertDescription>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {detectedSpikes.map((spike) => (
                  <li key={spike.topic}>
                    <span className="font-medium">{spike.topic}</span> — {spike.ratio.toFixed(1)}x normal
                    volume (last 24h: {formatNumber(spike.last_24h)})
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : spikes.isSuccess ? (
          <p className="text-xs text-muted-foreground">No unusual activity right now.</p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Sentiment over the last 14 days</CardTitle>
            <CardDescription>How positive and negative mentions stack up each day.</CardDescription>
          </CardHeader>
          <CardContent>
            {trend.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : trend.isError ? (
              <ErrorNote
                title="Couldn't load the trend"
                description={describeError(trend.error, "The sentiment trend is unavailable right now.")}
              />
            ) : trend.data && trend.data.points.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend.data.points} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => String(value).slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="positive"
                      name="Positive"
                      stackId="1"
                      stroke={SENTIMENT_COLORS.positive}
                      fill={SENTIMENT_COLORS.positive}
                      fillOpacity={0.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="neutral"
                      name="Neutral"
                      stackId="1"
                      stroke={SENTIMENT_COLORS.neutral}
                      fill={SENTIMENT_COLORS.neutral}
                      fillOpacity={0.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="negative"
                      name="Negative"
                      stackId="1"
                      stroke={SENTIMENT_COLORS.negative}
                      fill={SENTIMENT_COLORS.negative}
                      fillOpacity={0.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="strongly_negative"
                      name="Strongly negative"
                      stackId="1"
                      stroke={SENTIMENT_COLORS.strongly_negative}
                      fill={SENTIMENT_COLORS.strongly_negative}
                      fillOpacity={0.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyNote message="No sentiment data yet. Add some mentions to see the trend." />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Mentions by topic</CardTitle>
              <CardDescription>Which parts of the business people talk about most.</CardDescription>
            </CardHeader>
            <CardContent>
              {topics.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : topics.isError ? (
                <ErrorNote
                  title="Couldn't load topics"
                  description={describeError(topics.error, "The topic breakdown is unavailable right now.")}
                />
              ) : topics.data && topics.data.topics.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topics.data.topics}
                      layout="vertical"
                      margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="topic"
                        width={128}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="count" name="Mentions" radius={4}>
                        {topics.data.topics.map((entry, index) => (
                          <Cell
                            key={entry.topic}
                            fill={TOPIC_BAR_COLORS[index % TOPIC_BAR_COLORS.length] ?? "var(--primary)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyNote message="No topics yet. Add some mentions to see the breakdown." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Topic details</CardTitle>
              <CardDescription>Volume, complaints and average sentiment per topic.</CardDescription>
            </CardHeader>
            <CardContent>
              {topics.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : topics.isError ? (
                <ErrorNote
                  title="Couldn't load topics"
                  description={describeError(topics.error, "The topic breakdown is unavailable right now.")}
                />
              ) : topics.data && topics.data.topics.length > 0 ? (
                <ul className="divide-y divide-border">
                  {topics.data.topics.map((topic) => (
                    <li key={topic.topic} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 truncate text-sm text-foreground">{topic.topic}</span>
                      <span className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                        <span className="text-numeric">{formatNumber(topic.count)}</span>
                        <span className="text-numeric text-risk-critical">
                          {formatNumber(topic.complaints)} complaints
                        </span>
                        <span className="text-numeric w-10 text-right">
                          {topic.avg_sentiment.toFixed(2)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyNote message="No topics yet. Add some mentions to see the breakdown." />
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Latest high-priority threads</CardTitle>
            <CardDescription>The conversations that need attention first.</CardDescription>
          </CardHeader>
          <CardContent>
            {threads.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : threads.isError ? (
              <ErrorNote
                title="Couldn't load threads"
                description={describeError(threads.error, "Your incident threads are unavailable right now.")}
              />
            ) : highPriorityThreads.length > 0 ? (
              <ul className="divide-y divide-border">
                {highPriorityThreads.map((thread) => (
                  <li key={thread.id}>
                    <Link
                      to="/threads/$id"
                      params={{ id: String(thread.id) }}
                      className="flex items-center justify-between gap-4 rounded-md px-2 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{thread.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {thread.topic} · {formatNumber(thread.mention_count)} mentions ·{" "}
                          {relativeTime(thread.last_seen)}
                        </p>
                      </div>
                      <PriorityBadge tier={thread.priority_tier} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote message="No high-priority threads right now — nice and calm." />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
