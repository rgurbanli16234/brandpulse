/**
 * Typed client for the BrandPulse API.
 *
 * The token is held in module state (set by the auth provider) and attached to
 * every request. All errors are surfaced as `ApiError` so the UI can show a
 * readable message instead of a raw fetch failure.
 */

// Same-origin by default: in production the API is served by the same FastAPI app
// that serves this SPA (e.g. "/api/v1"). Override with VITE_API_URL for split hosting.
const API_URL: string = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  /** True when the request never reached the server (connection refused, DNS, CORS). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

/** Fired when the server rejects the token we sent, so the session store can sign out. */
export const UNAUTHORIZED_EVENT = "brandpulse:unauthorized";

/**
 * Turn any thrown value into a message we can show the user. API failures carry the
 * real reason (network / 401 / 409 / 422 / 500); anything else falls back.
 */
export function describeError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

function notifyUnauthorized(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
  query?: Query;
}

function buildUrl(path: string, query?: Query): string {
  const url = `${API_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const init: RequestInit = { method: options.method ?? "GET", headers };
  if (body !== undefined) init.body = body;

  const url = buildUrl(path, options.query);

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    // fetch only rejects for network-level failures, so surface the real cause.
    throw new ApiError(0, `Cannot reach the API at ${API_URL}. Make sure the backend is running.`);
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = (await response.json()) as { detail?: unknown };
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      /* keep the status text */
    }
    // Only a *token-authenticated* 401 means the session is dead; a failed login
    // (no token was attached) must not sign the user out.
    if (response.status === 401 && authToken) notifyUnauthorized();
    throw new ApiError(response.status, detail || "Request failed");
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* ---------- Types (mirror the backend schemas) ---------- */

export type SentimentLabel = "strongly_negative" | "negative" | "neutral" | "positive";
export type PriorityTier = "Low" | "Medium" | "High" | "Critical";
export type ThreadStatus = "open" | "investigating" | "resolved";
export type KeywordType = "brand" | "product" | "executive" | "typo" | "competitor";
export type SourceType = "csv" | "manual" | "reddit" | "rss" | "demo";

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface Business {
  id: number;
  name: string;
  plan: string;
  alert_email: string | null;
  webhook_url: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
  business: Business;
}

export interface Mention {
  id: number;
  source: string;
  author: string | null;
  author_followers: number;
  text: string;
  url: string | null;
  language: string;
  created_at: string;
  engagement: number;
  sentiment_label: SentimentLabel | null;
  sentiment_score: number | null;
  is_complaint: boolean;
  topic: string | null;
  thread_id: number | null;
  priority_score: number | null;
  priority_tier: PriorityTier | null;
}

export interface ScoreBreakdown {
  score: number;
  weights: Record<string, number>;
  factors: { severity: number; reach: number; velocity: number };
  inputs: Record<string, number>;
  tier: string;
}

export interface Thread {
  id: number;
  title: string;
  topic: string;
  first_seen: string;
  last_seen: string;
  mention_count: number;
  priority_tier: PriorityTier;
  status: ThreadStatus;
}

export interface ThreadDetail extends Thread {
  priority_score: number | null;
  score_breakdown: ScoreBreakdown | null;
  mentions: Mention[];
}

export interface AlertItem {
  id: number;
  thread_id: number;
  thread_title: string | null;
  tier: PriorityTier;
  summary: string;
  channel: string;
  sent_at: string;
  acknowledged: boolean;
}

export interface TopicStat {
  topic: string;
  count: number;
  complaints: number;
  avg_sentiment: number;
}

export interface Summary {
  total_mentions: number;
  mentions_24h: number;
  complaints: number;
  open_threads: number;
  high_threads: number;
  critical_threads: number;
  unacknowledged_alerts: number;
  avg_sentiment: number;
  sentiment_distribution: Record<string, number>;
  top_topics: TopicStat[];
}

export interface SentimentPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  strongly_negative: number;
  total: number;
}

export interface SentimentTrend {
  days: number;
  points: SentimentPoint[];
}

export interface Spike {
  topic: string;
  last_24h: number;
  daily_average: number;
  ratio: number;
  detected: boolean;
}

export interface Spikes {
  window_hours: number;
  lookback_days: number;
  multiplier: number;
  spikes: Spike[];
}

export interface Keyword {
  id: number;
  term: string;
  type: KeywordType;
}

export interface Source {
  id: number;
  type: SourceType;
  config_json: Record<string, unknown> | null;
  enabled: boolean;
}

export interface AnalyzeResult {
  sentiment_label: SentimentLabel;
  sentiment_score: number;
  is_complaint: boolean;
  topic: string;
  language: string;
}

export interface CsvUploadResult {
  imported: number;
  skipped: number;
  pipeline: Record<string, number>;
}

export interface ManualMentionInput {
  text: string;
  author?: string | null;
  author_followers?: number;
  url?: string | null;
  engagement?: number;
  created_at?: string | null;
}

/* ---------- Endpoints ---------- */

export const api = {
  register(input: {
    business_name: string;
    email: string;
    password: string;
    alert_email?: string;
  }): Promise<TokenResponse> {
    return request("/auth/register", { method: "POST", body: input });
  },

  login(input: { email: string; password: string }): Promise<TokenResponse> {
    return request("/auth/login", { method: "POST", body: input });
  },

  analyze(text: string): Promise<AnalyzeResult> {
    return request("/analyze", { method: "POST", body: { text } });
  },

  summary(): Promise<Summary> {
    return request("/analytics/summary");
  },

  sentimentTrend(days = 14): Promise<SentimentTrend> {
    return request("/analytics/sentiment-trend", { query: { days } });
  },

  topics(): Promise<{ total: number; topics: TopicStat[] }> {
    return request("/analytics/topics");
  },

  spikes(): Promise<Spikes> {
    return request("/analytics/spikes");
  },

  mentions(filters: {
    sentiment?: string;
    topic?: string;
    tier?: string;
    complaint_only?: boolean;
    q?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Mention[]> {
    return request("/mentions", { query: filters });
  },

  addMention(input: ManualMentionInput): Promise<Mention> {
    return request("/mentions/manual", { method: "POST", body: input });
  },

  uploadCsv(file: File): Promise<CsvUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    return request("/mentions/upload-csv", { method: "POST", formData });
  },

  threads(filters: { status?: string; tier?: string; limit?: number } = {}): Promise<Thread[]> {
    return request("/threads", { query: filters });
  },

  thread(id: number): Promise<ThreadDetail> {
    return request(`/threads/${id}`);
  },

  updateThreadStatus(id: number, status: ThreadStatus): Promise<Thread> {
    return request(`/threads/${id}`, { method: "PATCH", body: { status } });
  },

  alerts(filters: { acknowledged?: boolean; limit?: number } = {}): Promise<AlertItem[]> {
    return request("/alerts", { query: filters });
  },

  acknowledgeAlert(id: number): Promise<AlertItem> {
    return request(`/alerts/${id}/ack`, { method: "POST" });
  },

  keywords(): Promise<Keyword[]> {
    return request("/keywords");
  },

  createKeyword(input: { term: string; type: KeywordType }): Promise<Keyword> {
    return request("/keywords", { method: "POST", body: input });
  },

  deleteKeyword(id: number): Promise<void> {
    return request(`/keywords/${id}`, { method: "DELETE" });
  },

  sources(): Promise<Source[]> {
    return request("/sources");
  },

  createSource(input: {
    type: SourceType;
    config_json?: Record<string, unknown> | null;
    enabled?: boolean;
  }): Promise<Source> {
    return request("/sources", { method: "POST", body: input });
  },

  updateSource(id: number, input: { config_json?: Record<string, unknown>; enabled?: boolean }): Promise<Source> {
    return request(`/sources/${id}`, { method: "PATCH", body: input });
  },

  deleteSource(id: number): Promise<void> {
    return request(`/sources/${id}`, { method: "DELETE" });
  },

  syncSource(id: number): Promise<{ mentions_created: number; pipeline: Record<string, number> }> {
    return request(`/sources/${id}/sync`, { method: "POST" });
  },

  seedDemo(): Promise<{
    mentions_created: number;
    mentions_generated: number;
    pipeline: Record<string, number>;
  }> {
    return request("/demo/seed", { method: "POST" });
  },
};
