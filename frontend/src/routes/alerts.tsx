import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BellRing, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiError, type AlertItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts — BrandPulse" }] }),
  component: AlertsPage,
});

type Filter = "unread" | "all";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function AlertsPage() {
  const { session } = useAuth();
  const [filter, setFilter] = useState<Filter>("unread");
  const queryClient = useQueryClient();

  const alerts = useQuery({
    queryKey: ["alerts", filter],
    queryFn: () => (filter === "unread" ? api.alerts({ acknowledged: false }) : api.alerts()),
    enabled: Boolean(session),
  });
  const items = alerts.data ?? [];

  const acknowledge = useMutation({
    mutationFn: (id: number) => api.acknowledgeAlert(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
      ]);
      toast.success("Alert acknowledged");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Could not acknowledge the alert"));
    },
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Notifications raised for high and critical incident threads.
          </p>
        </header>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {alerts.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        ) : alerts.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Couldn't load alerts</AlertTitle>
            <AlertDescription>
              {errorMessage(alerts.error, "Something went wrong while fetching alerts.")}
            </AlertDescription>
          </Alert>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <BellRing className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No alerts. High and critical threads will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                acknowledging={acknowledge.isPending && acknowledge.variables === alert.id}
                onAcknowledge={() => acknowledge.mutate(alert.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AlertCard({
  alert,
  acknowledging,
  onAcknowledge,
}: {
  alert: AlertItem;
  acknowledging: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <Card className={cn(alert.acknowledged && "border-border/60 bg-card/60")}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge tier={alert.tier} />
          {alert.acknowledged ? (
            <Badge variant="secondary" className="gap-1 text-muted-foreground">
              <Check className="h-3 w-3" /> Acknowledged
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">{alert.channel}</span>
          <span className="text-numeric text-xs text-muted-foreground">
            {relativeTime(alert.sent_at)}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-foreground">{alert.summary}</p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/threads/$id"
            params={{ id: String(alert.thread_id) }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {alert.thread_title ?? "Untitled thread"}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          {alert.acknowledged ? null : (
            <Button
              size="sm"
              variant="outline"
              onClick={onAcknowledge}
              disabled={acknowledging}
            >
              <Check className="h-3.5 w-3.5" /> Acknowledge
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
