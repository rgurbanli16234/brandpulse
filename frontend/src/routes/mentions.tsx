import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, Inbox, Search } from "lucide-react";
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
import { SENTIMENT_COLORS, SENTIMENT_TEXT, formatNumber, relativeTime } from "@/lib/format";

export const Route = createFileRoute("/mentions")({
  head: () => ({ meta: [{ title: "Mentions — BrandPulse" }] }),
  component: MentionsPage,
});

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

function parseFollowers(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function SentimentChip({ label }: { label: SentimentLabel | null }) {
  const color = label ? SENTIMENT_COLORS[label] : "var(--muted-foreground)";
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium"
      style={{ color }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label ? SENTIMENT_TEXT[label] : "Unscored"}
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
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">No mentions match these filters.</p>
      <Button variant="outline" size="sm" onClick={onReset}>
        Clear filters
      </Button>
    </div>
  );
}

function MentionsPage() {
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
      toast.success("Mention added", {
        description: "We analyzed it and added it to your feed.",
      });
      setText("");
      setAuthor("");
      setFollowers("");
      invalidateData();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error("Duplicate mention", { description: "This text was already submitted." });
      } else {
        toast.error("Couldn't add the mention", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      }
    },
  });

  const upload = useMutation({
    mutationFn: (csv: File) => api.uploadCsv(csv),
    onSuccess: (result) => {
      setUploadResult(result);
      setFile(null);
      toast.success("CSV imported", {
        description: `${formatNumber(result.imported)} imported · ${formatNumber(result.skipped)} skipped.`,
      });
      invalidateData();
    },
    onError: (error) => {
      toast.error("Couldn't import the CSV", {
        description: error instanceof Error ? error.message : "Please check the file and try again.",
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mentions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add new mentions and explore everything we've collected about your brand.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add mentions</CardTitle>
            <CardDescription>Paste a single mention or upload a CSV export.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="paste">
              <TabsList>
                <TabsTrigger value="paste">Paste a mention</TabsTrigger>
                <TabsTrigger value="csv">Upload CSV</TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="mention-text">Mention text</Label>
                  <Textarea
                    id="mention-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What did the customer say?"
                    rows={3}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="mention-author">Author (optional)</Label>
                    <Input
                      id="mention-author"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mention-followers">Author followers (optional)</Label>
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
                  {addMention.isPending ? "Adding…" : "Add mention"}
                </Button>
              </TabsContent>

              <TabsContent value="csv" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">CSV file</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The file needs a <code className="font-mono">text</code> column. Optional columns:
                    author, url, created_at.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (file) upload.mutate(file);
                  }}
                  disabled={!file || upload.isPending}
                >
                  {upload.isPending ? "Uploading…" : "Upload CSV"}
                </Button>
                {uploadResult ? (
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Imported{" "}
                    <span className="font-semibold text-foreground">
                      {formatNumber(uploadResult.imported)}
                    </span>{" "}
                    · skipped{" "}
                    <span className="font-semibold text-foreground">
                      {formatNumber(uploadResult.skipped)}
                    </span>
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Sentiment</Label>
              <Select value={sentiment} onValueChange={setSentiment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sentiments</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="strongly_negative">Strongly negative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All topics</SelectItem>
                  {TOPICS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Complaints only</Label>
              <div className="flex h-9 items-center">
                <Switch checked={complaintOnly} onCheckedChange={setComplaintOnly} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mention-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="mention-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search text…"
                  className="pl-8"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feed</CardTitle>
            <CardDescription>
              {mentions.data
                ? `${formatNumber(mentions.data.length)} mention${mentions.data.length === 1 ? "" : "s"} shown`
                : "Live feed of collected mentions"}
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
                title="Couldn't load mentions"
                description={describeError(mentions.error, "We couldn't load mentions. Try adjusting the filters or refreshing.")}
              />
            ) : mentions.data && mentions.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mention</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Priority</TableHead>
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
                            <ExternalLink className="h-3 w-3" /> Open source
                          </a>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top text-xs text-muted-foreground">
                        {mention.author ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top text-xs text-muted-foreground">
                        <span className="uppercase">{mention.source}</span>
                        <span className="ml-1 text-[10px]">· {mention.language}</span>
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
                            <Badge variant="destructive">Complaint</Badge>
                          ) : null}
                          {mention.topic ? <Badge variant="outline">{mention.topic}</Badge> : null}
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
