import { mapApiError, NetworkError, TermixError } from "./errors.js";

export interface RequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  /** Auto-retry is only safe for idempotent requests. GET defaults to true; writes to false. */
  idempotent?: boolean;
  /** Attach the bearer token. Default true. Public reads pass false. */
  auth?: boolean;
  signal?: AbortSignal;
  /** Opt-in idempotency key forwarded as `idempotency-key` (e.g. checkout). */
  idempotencyKey?: string;
}

export interface RequestLog {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}
export interface ResponseLog {
  method: string;
  url: string;
  status: number;
  durationMs: number;
}
export interface Interceptor {
  onRequest?: (req: RequestLog) => void | Promise<void>;
  onResponse?: (res: ResponseLog) => void | Promise<void>;
}

export interface HttpClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
  tokenProvider?: () => Promise<string | undefined> | string | undefined;
  /** Called once on a 401; return true if a refresh succeeded so the request is retried. */
  onUnauthorized?: () => Promise<boolean>;
  interceptors?: Interceptor[];
  fetchImpl?: typeof fetch;
}

const SENSITIVE_HEADERS = new Set(["authorization", "idempotency-key"]);

function redact(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? "<redacted>" : v;
  }
  return out;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function backoff(attempt: number): Promise<void> {
  const base = Math.min(1000 * 2 ** (attempt - 1), 8000);
  const jitter = Math.floor(Math.random() * 250);
  await new Promise((r) => setTimeout(r, base + jitter));
}

export class HttpClient {
  constructor(private readonly opts: HttpClientOptions) {}

  get baseUrl(): string {
    return this.opts.baseUrl;
  }

  get<T>(path: string, o: RequestOptions = {}): Promise<T> {
    return this.request<T>("GET", path, { idempotent: true, ...o });
  }
  post<T>(path: string, o: RequestOptions = {}): Promise<T> {
    return this.request<T>("POST", path, o);
  }
  patch<T>(path: string, o: RequestOptions = {}): Promise<T> {
    return this.request<T>("PATCH", path, o);
  }
  delete<T>(path: string, o: RequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", path, { idempotent: true, ...o });
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const base = this.opts.baseUrl.replace(/\/+$/, "");
    let url = path.startsWith("/") ? base + path : `${base}/${path}`;
    if (query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        qs.append(k, String(v));
      }
      const s = qs.toString();
      if (s) url += (url.includes("?") ? "&" : "?") + s;
    }
    return url;
  }

  async request<T>(method: string, path: string, o: RequestOptions = {}): Promise<T> {
    const fetchImpl = this.opts.fetchImpl ?? fetch;
    const url = this.buildUrl(path, o.query);
    const maxRetries = o.idempotent ? this.opts.maxRetries ?? 2 : 0;
    let attempt = 0;
    let refreshed = false;

    for (;;) {
      const headers: Record<string, string> = { accept: "application/json", ...(o.headers ?? {}) };
      if (o.body !== undefined) headers["content-type"] = "application/json";
      if (o.idempotencyKey) headers["idempotency-key"] = o.idempotencyKey;
      if (o.auth !== false) {
        const token = await this.opts.tokenProvider?.();
        if (token) headers["authorization"] = `Bearer ${token}`;
      }

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), this.opts.timeoutMs ?? 30_000);
      const started = Date.now();
      try {
        for (const i of this.opts.interceptors ?? []) {
          await i.onRequest?.({ method, url, headers: redact(headers), body: o.body });
        }
        const res = await fetchImpl(url, {
          method,
          headers,
          body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
          signal: o.signal ?? ctrl.signal,
        });
        const durationMs = Date.now() - started;
        for (const i of this.opts.interceptors ?? []) {
          await i.onResponse?.({ method, url, status: res.status, durationMs });
        }

        if (res.status === 401 && o.auth !== false && !refreshed && this.opts.onUnauthorized) {
          refreshed = await this.opts.onUnauthorized();
          if (refreshed) continue;
        }
        if (res.status === 204) return undefined as T;

        const text = await res.text();
        const data = text ? safeJson(text) : undefined;
        if (!res.ok) {
          if ((res.status >= 500 || res.status === 429) && attempt < maxRetries) {
            attempt += 1;
            await backoff(attempt);
            continue;
          }
          throw mapApiError(res.status, data);
        }
        return data as T;
      } catch (err) {
        if (err instanceof TermixError) throw err;
        const aborted = err instanceof Error && err.name === "AbortError";
        if (attempt < maxRetries) {
          attempt += 1;
          await backoff(attempt);
          continue;
        }
        throw new NetworkError(
          `${aborted ? "request timeout" : "network error"}: ${method} ${path}`,
          err,
        );
      } finally {
        clearTimeout(timer);
      }
    }
  }
}
