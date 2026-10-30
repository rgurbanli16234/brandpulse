import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Building2, Gauge, Hash, Plus, Radar, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  api,
  ApiError,
  type Business,
  type KeywordType,
  type Source,
  type SourceType,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — BrandPulse" }] }),
  component: SettingsPage,
});

const KEYWORD_TYPES: { value: KeywordType; label: string }[] = [
  { value: "brand", label: "Brand" },
  { value: "product", label: "Product" },
  { value: "executive", label: "Executive" },
  { value: "typo", label: "Typo" },
  { value: "competitor", label: "Competitor" },
];

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: "csv", label: "CSV import" },
  { value: "manual", label: "Manual entry" },
  { value: "reddit", label: "Reddit" },
  { value: "rss", label: "RSS feed" },
  { value: "demo", label: "Demo data" },
];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** Source types the backend pulls on a schedule (and that can be synced on demand). */
const PULL_SOURCE_TYPES: SourceType[] = ["rss"];

function describeSource(source: Source): string {
  if (source.type === "rss") {
    const feeds = source.config_json?.["feeds"];
    const count = Array.isArray(feeds) ? feeds.length : 0;
    return count > 0
      ? `${count} feed${count === 1 ? "" : "s"} · ${source.enabled ? "enabled" : "disabled"}`
      : "No feeds configured";
  }
  return source.enabled ? "Enabled" : "Disabled";
}

function SettingsPage() {
  const { session } = useAuth();

  return (
    <AppShell>
      {session ? (
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure what BrandPulse monitors and how it delivers alerts.
            </p>
          </header>

          <BusinessSection business={session.business} />
          <KeywordsSection />
          <SourcesSection />
          <AnalyzerSection />
          <ThresholdsSection />
        </div>
      ) : null}
    </AppShell>
  );
}

/* ---------- Business ---------- */

function BusinessSection({ business }: { business: Business }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" /> Business
        </CardTitle>
        <CardDescription>
          Alert delivery uses these values — notifications are sent to the alert email and posted to
          the webhook URL when one is configured.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Field label="Business name" value={business.name} />
        <Field label="Plan" value={business.plan} />
        <Field label="Alert email" value={business.alert_email} />
        <Field label="Webhook URL" value={business.webhook_url} />
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm text-foreground" title={value ?? "Not set"}>
        {value && value.length > 0 ? value : "Not set"}
      </p>
    </div>
  );
}

/* ---------- Keywords ---------- */

function KeywordsSection() {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [type, setType] = useState<KeywordType>("brand");

  const keywords = useQuery({ queryKey: ["keywords"], queryFn: () => api.keywords() });
  const keywordItems = keywords.data ?? [];

  const createKeyword = useMutation({
    mutationFn: (input: { term: string; type: KeywordType }) => api.createKeyword(input),
    onSuccess: async () => {
      setTerm("");
      await queryClient.invalidateQueries({ queryKey: ["keywords"] });
      toast.success("Keyword added");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not add the keyword")),
  });

  const deleteKeyword = useMutation({
    mutationFn: (id: number) => api.deleteKeyword(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["keywords"] });
      toast.success("Keyword removed");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not remove the keyword")),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = term.trim();
    if (trimmed.length === 0) {
      toast.error("Enter a keyword term");
      return;
    }
    createKeyword.mutate({ term: trimmed, type });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Hash className="h-4 w-4 text-primary" /> Keywords
        </CardTitle>
        <CardDescription>
          Keywords define what the business monitors — every incoming mention is matched against
          these terms to decide whether it is relevant to your brand.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="keyword-term">Term</Label>
            <Input
              id="keyword-term"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="e.g. BrandPulse"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as KeywordType)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KEYWORD_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={createKeyword.isPending}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>

        <Separator />

        {keywords.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : keywords.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Couldn't load keywords</AlertTitle>
            <AlertDescription>
              {errorMessage(keywords.error, "Something went wrong while fetching keywords.")}
            </AlertDescription>
          </Alert>
        ) : keywordItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No keywords yet. Add your first term above.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {keywordItems.map((keyword) => (
              <li key={keyword.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {keyword.term}
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {keyword.type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${keyword.term}`}
                  disabled={deleteKeyword.isPending && deleteKeyword.variables === keyword.id}
                  onClick={() => deleteKeyword.mutate(keyword.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Sources ---------- */

function SourcesSection() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<SourceType>("csv");
  const [feedUrls, setFeedUrls] = useState("");

  const sources = useQuery({ queryKey: ["sources"], queryFn: () => api.sources() });
  const sourceItems = sources.data ?? [];

  const createSource = useMutation({
    mutationFn: (input: { type: SourceType; config_json?: Record<string, unknown> }) =>
      api.createSource(input),
    onSuccess: async () => {
      setFeedUrls("");
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast.success("Source added");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not add the source")),
  });

  const syncSource = useMutation({
    mutationFn: (id: number) => api.syncSource(id),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      await queryClient.invalidateQueries({ queryKey: ["mentions"] });
      toast.success(
        result.mentions_created > 0
          ? `Pulled ${result.mentions_created} new mention(s)`
          : "No new mentions found",
      );
    },
    onError: (error) => toast.error(errorMessage(error, "Could not sync the source")),
  });

  const updateSource = useMutation({
    mutationFn: (input: { id: number; enabled: boolean }) =>
      api.updateSource(input.id, { enabled: input.enabled }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not update the source")),
  });

  const deleteSource = useMutation({
    mutationFn: (id: number) => api.deleteSource(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast.success("Source removed");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not remove the source")),
  });

  function addSource() {
    if (type !== "rss") {
      createSource.mutate({ type });
      return;
    }
    const feeds = feedUrls
      .split(/[\s,]+/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
    if (feeds.length === 0) {
      toast.error("Add at least one RSS feed URL");
      return;
    }
    createSource.mutate({ type, config_json: { feeds } });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radar className="h-4 w-4 text-primary" /> Sources
        </CardTitle>
        <CardDescription>
          Sources are where BrandPulse collects mentions from. Enable or disable them without
          deleting their configuration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as SourceType)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "rss" ? (
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="feed-urls">Feed URLs</Label>
              <Input
                id="feed-urls"
                value={feedUrls}
                onChange={(event) => setFeedUrls(event.target.value)}
                placeholder="https://example.com/rss, https://news.example.com/feed"
              />
            </div>
          ) : null}
          <Button type="button" disabled={createSource.isPending} onClick={addSource}>
            <Plus className="h-4 w-4" /> Add source
          </Button>
        </div>

        <Separator />

        {sources.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : sources.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Couldn't load sources</AlertTitle>
            <AlertDescription>
              {errorMessage(sources.error, "Something went wrong while fetching sources.")}
            </AlertDescription>
          </Alert>
        ) : sourceItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No sources configured yet. Add one above to start collecting mentions.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {sourceItems.map((source) => (
              <li key={source.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Switch
                    checked={source.enabled}
                    aria-label={`Toggle ${source.type}`}
                    onCheckedChange={(checked) =>
                      updateSource.mutate({ id: source.id, enabled: checked })
                    }
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium capitalize text-foreground">
                      {source.type}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {describeSource(source)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {PULL_SOURCE_TYPES.includes(source.type) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={syncSource.isPending && syncSource.variables === source.id}
                      onClick={() => syncSource.mutate(source.id)}
                    >
                      <RefreshCw className="h-4 w-4" /> Sync now
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${source.type}`}
                    disabled={deleteSource.isPending && deleteSource.variables === source.id}
                    onClick={() => deleteSource.mutate(source.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Analyzer ---------- */

function AnalyzerSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radar className="h-4 w-4 text-primary" /> Analyzer
          <Badge variant="secondary" className="ml-1 font-mono text-[10px]">
            rules
          </Badge>
        </CardTitle>
        <CardDescription>The engine that scores sentiment and detects complaints.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          By default the analyzer runs in <span className="font-medium text-foreground">rules</span>{" "}
          mode — a lightweight, multilingual rule engine (English, Azerbaijani, Russian) that needs
          no model downloads.
        </p>
        <p>
          To use a Hugging Face model instead, set the{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
            ANALYZER
          </code>{" "}
          environment variable on the server. This is configured server-side and cannot be changed
          from the app.
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------- Alert thresholds ---------- */

function ThresholdsSection() {
  const rows: { label: string; value: string }[] = [
    { label: "Spike multiplier", value: "2.0x" },
    { label: "Alert cooldown", value: "60 min" },
    { label: "Priority weights", value: "Severity 0.5 · Reach 0.3 · Velocity 0.2" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4 text-primary" /> Alert thresholds
        </CardTitle>
        <CardDescription>
          Server-side defaults that decide when a thread is surfaced and how it is prioritised.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-b-0"
          >
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-numeric text-sm font-medium text-foreground">{row.value}</span>
          </div>
        ))}
        <p className="pt-2 text-xs text-muted-foreground">
          These are read-only and configured on the server.
        </p>
      </CardContent>
    </Card>
  );
}
