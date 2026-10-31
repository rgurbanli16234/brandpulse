import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Building2, Gauge, Hash, Plus, Radar, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";

import { AppShell } from "@/components/AppShell";
import { LanguageOptions } from "@/components/LanguageSwitcher";
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
import { KEYWORD_TYPE_KEYS, SOURCE_KEYS } from "@/lib/enums";
import { isPlanId } from "@/lib/plans";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — BrandPulse" }] }),
  component: SettingsPage,
});

const KEYWORD_TYPES = [
  { value: "brand", labelKey: `common:${KEYWORD_TYPE_KEYS.brand}` },
  { value: "product", labelKey: `common:${KEYWORD_TYPE_KEYS.product}` },
  { value: "executive", labelKey: `common:${KEYWORD_TYPE_KEYS.executive}` },
  { value: "typo", labelKey: `common:${KEYWORD_TYPE_KEYS.typo}` },
  { value: "competitor", labelKey: `common:${KEYWORD_TYPE_KEYS.competitor}` },
] as const satisfies ReadonlyArray<{ value: KeywordType; labelKey: string }>;

const SOURCE_TYPES = [
  { value: "csv", labelKey: `common:${SOURCE_KEYS.csv}` },
  { value: "manual", labelKey: `common:${SOURCE_KEYS.manual}` },
  { value: "reddit", labelKey: `common:${SOURCE_KEYS.reddit}` },
  { value: "rss", labelKey: `common:${SOURCE_KEYS.rss}` },
  { value: "demo", labelKey: `common:${SOURCE_KEYS.demo}` },
] as const satisfies ReadonlyArray<{ value: SourceType; labelKey: string }>;

/** Source types the backend pulls on a schedule (and that can be synced on demand). */
const PULL_SOURCE_TYPES: SourceType[] = ["rss"];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function SettingsPage() {
  const { t } = useTranslation(["app", "common"]);
  const { session } = useAuth();

  return (
    <AppShell>
      {session ? (
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("app:settings.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("app:settings.subtitle")}</p>
          </header>

          <BusinessSection business={session.business} />
          <KeywordsSection />
          <SourcesSection />
          <LanguageSection />
          <AnalyzerSection />
          <ThresholdsSection />
        </div>
      ) : null}
    </AppShell>
  );
}

/* ---------- Business ---------- */

function BusinessSection({ business }: { business: Business }) {
  const { t } = useTranslation(["app", "pricing"]);

  /** Plan values are ids from the API; the UI shows the translated plan name. */
  const planLabel = isPlanId(business.plan)
    ? t(`pricing:plans.items.${business.plan}.name`)
    : business.plan;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" /> {t("app:settings.business.title")}
        </CardTitle>
        <CardDescription>{t("app:settings.business.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Field label={t("app:settings.business.name")} value={business.name} />
        <Field label={t("app:settings.business.plan")} value={planLabel} />
        <Field label={t("app:settings.business.alertEmail")} value={business.alert_email} />
        <Field label={t("app:settings.business.webhook")} value={business.webhook_url} />
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  const { t } = useTranslation("app");
  const notSet = t("settings.business.notSet");

  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm text-foreground" title={value ?? notSet}>
        {value && value.length > 0 ? value : notSet}
      </p>
    </div>
  );
}

/* ---------- Keywords ---------- */

function KeywordsSection() {
  const { t } = useTranslation(["app", "common"]);
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
      toast.success(t("app:settings.keywords.added"));
    },
    onError: (error) =>
      toast.error(errorMessage(error, t("app:settings.keywords.addFailed"))),
  });

  const deleteKeyword = useMutation({
    mutationFn: (id: number) => api.deleteKeyword(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["keywords"] });
      toast.success(t("app:settings.keywords.removed"));
    },
    onError: (error) =>
      toast.error(errorMessage(error, t("app:settings.keywords.removeFailed"))),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = term.trim();
    if (trimmed.length === 0) {
      toast.error(t("app:settings.keywords.enterTerm"));
      return;
    }
    createKeyword.mutate({ term: trimmed, type });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Hash className="h-4 w-4 text-primary" /> {t("app:settings.keywords.title")}
        </CardTitle>
        <CardDescription>{t("app:settings.keywords.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="keyword-term">{t("app:settings.keywords.term")}</Label>
            <Input
              id="keyword-term"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t("app:settings.keywords.placeholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("app:settings.keywords.type")}</Label>
            <Select value={type} onValueChange={(value) => setType(value as KeywordType)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KEYWORD_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={createKeyword.isPending}>
            <Plus className="h-4 w-4" /> {t("app:settings.keywords.add")}
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
            <AlertTitle>{t("app:settings.keywords.loadError")}</AlertTitle>
            <AlertDescription>
              {errorMessage(keywords.error, t("app:settings.keywords.loadErrorBody"))}
            </AlertDescription>
          </Alert>
        ) : keywordItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t("app:settings.keywords.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {keywordItems.map((keyword) => (
              <li key={keyword.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {keyword.term}
                  </span>
                  <Badge variant="outline">{t(`common:${KEYWORD_TYPE_KEYS[keyword.type]}`)}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("app:settings.keywords.deleteAria", { term: keyword.term })}
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
  const { t } = useTranslation(["app", "common"]);
  const queryClient = useQueryClient();
  const [type, setType] = useState<SourceType>("csv");
  const [feedUrls, setFeedUrls] = useState("");

  const sources = useQuery({ queryKey: ["sources"], queryFn: () => api.sources() });
  const sourceItems = sources.data ?? [];

  /** Source types come back as API values; the UI shows the translated label. */
  const sourceTypeLabel = (value: string): string => {
    const key = SOURCE_KEYS[value as keyof typeof SOURCE_KEYS];
    return key ? t(`common:${key}`) : value;
  };

  const describeSource = (source: Source): string => {
    const state = source.enabled ? t("common:labels.enabled") : t("common:labels.disabled");
    if (source.type === "rss") {
      const feeds = source.config_json?.["feeds"];
      const count = Array.isArray(feeds) ? feeds.length : 0;
      return count > 0
        ? t("app:settings.sources.feedSummary", { count, state })
        : t("app:settings.sources.noFeeds");
    }
    return state;
  };

  const createSource = useMutation({
    mutationFn: (input: { type: SourceType; config_json?: Record<string, unknown> }) =>
      api.createSource(input),
    onSuccess: async () => {
      setFeedUrls("");
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast.success(t("app:settings.sources.added"));
    },
    onError: (error) => toast.error(errorMessage(error, t("app:settings.sources.addFailed"))),
  });

  const syncSource = useMutation({
    mutationFn: (id: number) => api.syncSource(id),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      await queryClient.invalidateQueries({ queryKey: ["mentions"] });
      toast.success(
        result.mentions_created > 0
          ? t("app:settings.sources.pulled", { count: result.mentions_created })
          : t("app:settings.sources.noNew"),
      );
    },
    onError: (error) => toast.error(errorMessage(error, t("app:settings.sources.syncFailed"))),
  });

  const updateSource = useMutation({
    mutationFn: (input: { id: number; enabled: boolean }) =>
      api.updateSource(input.id, { enabled: input.enabled }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (error) => toast.error(errorMessage(error, t("app:settings.sources.updateFailed"))),
  });

  const deleteSource = useMutation({
    mutationFn: (id: number) => api.deleteSource(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast.success(t("app:settings.sources.removed"));
    },
    onError: (error) => toast.error(errorMessage(error, t("app:settings.sources.removeFailed"))),
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
      toast.error(t("app:settings.sources.addFeed"));
      return;
    }
    createSource.mutate({ type, config_json: { feeds } });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radar className="h-4 w-4 text-primary" /> {t("app:settings.sources.title")}
        </CardTitle>
        <CardDescription>{t("app:settings.sources.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label>{t("app:settings.sources.type")}</Label>
            <Select value={type} onValueChange={(value) => setType(value as SourceType)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "rss" ? (
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="feed-urls">{t("app:settings.sources.feedUrls")}</Label>
              <Input
                id="feed-urls"
                value={feedUrls}
                onChange={(event) => setFeedUrls(event.target.value)}
                placeholder="https://example.com/rss, https://news.example.com/feed"
              />
            </div>
          ) : null}
          <Button type="button" disabled={createSource.isPending} onClick={addSource}>
            <Plus className="h-4 w-4" /> {t("app:settings.sources.addSource")}
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
            <AlertTitle>{t("app:settings.sources.loadError")}</AlertTitle>
            <AlertDescription>
              {errorMessage(sources.error, t("app:settings.sources.loadErrorBody"))}
            </AlertDescription>
          </Alert>
        ) : sourceItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t("app:settings.sources.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {sourceItems.map((source) => (
              <li key={source.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Switch
                    checked={source.enabled}
                    aria-label={t("app:settings.sources.toggleAria", {
                      type: sourceTypeLabel(source.type),
                    })}
                    onCheckedChange={(checked) =>
                      updateSource.mutate({ id: source.id, enabled: checked })
                    }
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {sourceTypeLabel(source.type)}
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
                      <RefreshCw className="h-4 w-4" /> {t("common:actions.syncNow")}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("app:settings.sources.deleteAria", {
                      type: sourceTypeLabel(source.type),
                    })}
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

/* ---------- Language ---------- */

function LanguageSection() {
  const { t } = useTranslation("app");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("settings.language.title")}</CardTitle>
        <CardDescription>{t("settings.language.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <LanguageOptions />
      </CardContent>
    </Card>
  );
}

/* ---------- Analyzer ---------- */

function AnalyzerSection() {
  const { t } = useTranslation("app");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radar className="h-4 w-4 text-primary" /> {t("settings.analyzer.title")}
          <Badge variant="secondary" className="ml-1 font-mono text-[10px]">
            {t("settings.analyzer.tag")}
          </Badge>
        </CardTitle>
        <CardDescription>{t("settings.analyzer.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <Trans
          ns="app"
          i18nKey="settings.analyzer.body1"
          components={{ bold: <span className="font-medium text-foreground" /> }}
        />
        <Trans
          ns="app"
          i18nKey="settings.analyzer.body2"
          components={{
            code: (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground" />
            ),
          }}
        />
      </CardContent>
    </Card>
  );
}

/* ---------- Alert thresholds ---------- */

function ThresholdsSection() {
  const { t } = useTranslation("app");

  const rows = [
    { labelKey: "settings.thresholds.spikeMultiplier", valueKey: "settings.thresholds.spikeValue" },
    { labelKey: "settings.thresholds.alertCooldown", valueKey: "settings.thresholds.cooldownValue" },
    {
      labelKey: "settings.thresholds.priorityWeights",
      valueKey: "settings.thresholds.weightsValue",
    },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4 text-primary" /> {t("settings.thresholds.title")}
        </CardTitle>
        <CardDescription>{t("settings.thresholds.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.labelKey}
            className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-b-0"
          >
            <span className="text-sm text-muted-foreground">{t(row.labelKey)}</span>
            <span className="text-numeric text-sm font-medium text-foreground">
              {t(row.valueKey)}
            </span>
          </div>
        ))}
        <p className="pt-2 text-xs text-muted-foreground">{t("settings.thresholds.readOnly")}</p>
      </CardContent>
    </Card>
  );
}
