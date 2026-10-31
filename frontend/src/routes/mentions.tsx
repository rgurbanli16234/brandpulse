import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, Inbox, Search } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PriorityBadge } from "@/components/PriorityBadge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api, describeError, type CsvUploadResult, type SentimentLabel } from "@/lib/api";
import {
  MENTION_LANGUAGE_KEYS,
  PRIORITY_KEYS,
  SENTIMENT_KEYS,
  SOURCE_KEYS,
  topicKey,
} from "@/lib/enums";
import { SENTIMENT_COLORS, relativeTime } from "@/lib/format";
import { formatNumber } from "@/i18n/format";

export const Route = createFileRoute("/mentions")({
  head: () => ({ meta: [{ title: "Mentions — BrandPulse" }] }),
  component: MentionsPage,
});

/** Backend topic values offered in the filter. Sent to the API unchanged. */
const TOPICS = [
  "Billing/Payment",
  "Product Quality",
  "Customer Service",
  "Delivery/Shipping",
  "Website/App Bug",
  "Price",
  "Staff Behavior",
  "Other",
] as const;

/** Filter order for sentiment and priority. */
const SENTIMENT_FILTERS = ["positive", "neutral", "negative", "strongly_negative"] as const;
const PRIORITY_FILTERS = ["Low", "Medium", "High", "Critical"] as const;

function parseFollowers(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function SentimentChip({ label }: { label: SentimentLabel | null }) {
  const { t } = useTranslation("common");
  const color = label ? SENTIMENT_COLORS[label] : "var(--muted-foreground)";
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium"
      style={{ color }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label ? t(SENTIMENT_KEYS[label]) : t("labels.unscored")}
    </span>
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

function EmptyNote({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation(["app", "common"]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{t("app:mentions.empty")}</p>
      <Button variant="outline" size="sm" onClick={onReset}>
        {t("common:actions.clearFilters")}
      </Button>
    </div>
  );
}

function MentionsPage() {
  const { t } = useTranslation(["app", "common"]);
  const queryClient = useQueryClient();

  const [sentiment, setSentiment] = useState("all");
  const [topic, setTopic] = useState("all");
  const [tier, setTier] = useState("all");
  const [complaintOnly, setComplaintOnly] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [followers, setFollowers] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<CsvUploadResult | null>(null);

  /** API values are shown through their translated labels. */
  const topicLabel = (value: string): string => {
    const key = topicKey(value);
    return key ? t(`common:${key}`) : value;
  };

  const sourceLabel = (value: string): string => {
    const key = SOURCE_KEYS[value as keyof typeof SOURCE_KEYS];
    return key ? t(`common:${key}`) : value;
  };

  const languageLabel = (value: string): string => {
    const key = MENTION_LANGUAGE_KEYS[value as keyof typeof MENTION_LANGUAGE_KEYS];
    return key ? t(`common:${key}`) : value;
  };

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  const filters = useMemo(() => {
    const next: {
      sentiment?: string;
      topic?: string;
      tier?: string;
      complaint_only?: boolean;
      q?: string;
      limit?: number;
    } = { limit: 100 };
    if (sentiment !== "all") next.sentiment = sentiment;
    if (topic !== "all") next.topic = topic;
    if (tier !== "all") next.tier = tier;
    if (complaintOnly) next.complaint_only = true;
    if (debouncedQ) next.q = debouncedQ;
    return next;
  }, [sentiment, topic, tier, complaintOnly, debouncedQ]);

  const mentions = useQuery({
    queryKey: ["mentions", filters],
    queryFn: () => api.mentions(filters),
  });

  function invalidateData() {
    void queryClient.invalidateQueries({ queryKey: ["mentions"] });
    void queryClient.invalidateQueries({ queryKey: ["summary"] });
  }

  const addMention = useMutation({
    mutationFn: () =>
      api.addMention({
        text: text.trim(),
        author: author.trim() ? author.trim() : null,
        author_followers: parseFollowers(followers),
      }),
    onSuccess: () => {
      toast.success(t("app:mentions.toasts.added"), {
        description: t("app:mentions.toasts.addedBody"),
      });
      setText("");
      setAuthor("");
      setFollowers("");
      invalidateData();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error(t("app:mentions.toasts.duplicate"), {
          description: t("app:mentions.toasts.duplicateBody"),
        });
      } else {
        toast.error(t("app:mentions.toasts.addFailed"), {
          description: error instanceof Error ? error.message : t("app:mentions.toasts.addFailedBody"),
        });
      }
    },
  });

  const upload = useMutation({
    mutationFn: (csv: File) => api.uploadCsv(csv),
    onSuccess: (result) => {
      setUploadResult(result);
      setFile(null);
      toast.success(t("app:mentions.toasts.csvImported"), {
        description: t("app:mentions.toasts.csvImportedBody", {
          imported: formatNumber(result.imported),
          skipped: formatNumber(result.skipped),
        }),
      });
      invalidateData();
    },
    onError: (error) => {
      toast.error(t("app:mentions.toasts.csvFailed"), {
        description: error instanceof Error ? error.message : t("app:mentions.toasts.csvFailedBody"),
      });
    },
  });

  function clearFilters() {
    setSentiment("all");
    setTopic("all");
    setTier("all");
    setComplaintOnly(false);
    setQ("");
    setDebouncedQ("");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("app:mentions.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("app:mentions.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("app:mentions.add.title")}</CardTitle>
            <CardDescription>{t("app:mentions.add.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="paste">
              <TabsList>
                <TabsTrigger value="paste">{t("app:mentions.add.tabs.paste")}</TabsTrigger>
                <TabsTrigger value="csv">{t("app:mentions.add.tabs.csv")}</TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="mention-text">{t("app:mentions.add.textLabel")}</Label>
                  <Textarea
                    id="mention-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t("app:mentions.add.textPlaceholder")}
                    rows={3}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="mention-author">{t("app:mentions.add.authorLabel")}</Label>
                    <Input
                      id="mention-author"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder={t("app:mentions.add.authorPlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mention-followers">{t("app:mentions.add.followersLabel")}</Label>
                    <Input
                      id="mention-followers"
                      type="number"
                      min={0}
                      value={followers}
                      onChange={(e) => setFollowers(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => addMention.mutate()}
                  disabled={addMention.isPending || text.trim().length === 0}
                >
                  {addMention.isPending
                    ? t("app:mentions.add.submitting")
                    : t("app:mentions.add.submit")}
                </Button>
              </TabsContent>

              <TabsContent value="csv" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">{t("app:mentions.add.csvLabel")}</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    <Trans
                      ns="app"
                      i18nKey="mentions.add.csvHint"
                      components={{ code: <code className="font-mono" /> }}
                    />
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (file) upload.mutate(file);
                  }}
                  disabled={!file || upload.isPending}
                >
                  {upload.isPending
                    ? t("app:mentions.add.uploading")
                    : t("app:mentions.add.upload")}
                </Button>
                {uploadResult ? (
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    {t("app:mentions.add.importResult", {
                      imported: formatNumber(uploadResult.imported),
                      skipped: formatNumber(uploadResult.skipped),
                    })}
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>{t("app:mentions.filters.sentiment")}</Label>
              <Select value={sentiment} onValueChange={setSentiment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("app:mentions.filters.allSentiments")}</SelectItem>
                  {SENTIMENT_FILTERS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`common:${SENTIMENT_KEYS[value]}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("app:mentions.filters.topic")}</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("app:mentions.filters.allTopics")}</SelectItem>
                  {TOPICS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {topicLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("app:mentions.filters.priority")}</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("app:mentions.filters.allPriorities")}</SelectItem>
                  {PRIORITY_FILTERS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`common:${PRIORITY_KEYS[value]}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("app:mentions.filters.complaintsOnly")}</Label>
              <div className="flex h-9 items-center">
                <Switch checked={complaintOnly} onCheckedChange={setComplaintOnly} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mention-search">{t("app:mentions.filters.search")}</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="mention-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("app:mentions.filters.searchPlaceholder")}
                  className="pl-8"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("app:mentions.feed.title")}</CardTitle>
            <CardDescription>
              {mentions.data
                ? t("app:mentions.feed.shown", { count: mentions.data.length })
                : t("app:mentions.feed.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mentions.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : mentions.isError ? (
              <ErrorNote
                title={t("app:mentions.errors.loadTitle")}
                description={describeError(mentions.error, t("app:mentions.errors.loadBody"))}
              />
            ) : mentions.data && mentions.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("app:mentions.table.mention")}</TableHead>
                    <TableHead>{t("app:mentions.table.author")}</TableHead>
                    <TableHead>{t("app:mentions.table.source")}</TableHead>
                    <TableHead>{t("app:mentions.table.when")}</TableHead>
                    <TableHead>{t("app:mentions.table.sentiment")}</TableHead>
                    <TableHead>{t("app:mentions.table.flags")}</TableHead>
                    <TableHead>{t("app:mentions.table.priority")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mentions.data.map((mention) => (
                    <TableRow key={mention.id}>
                      <TableCell className="max-w-[360px] align-top">
                        <p className="line-clamp-2 text-sm text-foreground">{mention.text}</p>
                        {mention.url ? (
                          <a
                            href={mention.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> {t("app:mentions.table.openSource")}
                          </a>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top text-xs text-muted-foreground">
                        {mention.author ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top text-xs text-muted-foreground">
                        <span className="uppercase">{sourceLabel(mention.source)}</span>
                        <span className="ml-1 text-[10px]">· {languageLabel(mention.language)}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top text-xs text-muted-foreground">
                        {relativeTime(mention.created_at)}
                      </TableCell>
                      <TableCell className="align-top">
                        <SentimentChip label={mention.sentiment_label} />
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {mention.is_complaint ? (
                            <Badge variant="destructive">{t("app:mentions.complaintBadge")}</Badge>
                          ) : null}
                          {mention.topic ? (
                            <Badge variant="outline">{topicLabel(mention.topic)}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top">
                        {mention.priority_tier ? (
                          <PriorityBadge tier={mention.priority_tier} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyNote onReset={clearFilters} />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
