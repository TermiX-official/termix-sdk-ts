// Realtime via Centrifugo SSE (the backend has NO webhooks). The /realtime/sse stream
// is header-less and self-authenticates from `?token=` (the wallet JWT). We parse the
// text/event-stream over fetch so no EventSource/global dependency is required.
export interface RealtimeEvent {
  event?: string;
  data: string;
  id?: string;
}
export interface SseSubscription {
  close(): void;
}
export interface SubscribeOptions {
  onEvent: (e: RealtimeEvent) => void;
  onError?: (err: unknown) => void;
  signal?: AbortSignal;
}

export class RealtimeResource {
  constructor(
    private readonly baseUrl: string,
    private readonly tokenProvider: () => Promise<string | undefined> | string | undefined,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /** Subscribe to the SSE stream; returns a handle whose close() aborts it. */
  async subscribe(opts: SubscribeOptions): Promise<SseSubscription> {
    const token = await this.tokenProvider();
    if (!token) throw new Error("realtime.subscribe requires an authenticated session (no token)");
    const url = `${this.baseUrl.replace(/\/+$/, "")}/realtime/sse?token=${encodeURIComponent(token)}`;
    const ctrl = new AbortController();
    const signal = opts.signal
      ? anySignal([opts.signal, ctrl.signal])
      : ctrl.signal;

    void (async () => {
      try {
        const res = await this.fetchImpl(url, { headers: { accept: "text/event-stream" }, signal });
        if (!res.ok || !res.body) throw new Error(`realtime SSE failed: HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const raw = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const parsed = parseEvent(raw);
            if (parsed) opts.onEvent(parsed);
          }
        }
      } catch (err) {
        if (!signal.aborted) opts.onError?.(err);
      }
    })();

    return { close: () => ctrl.abort() };
  }
}

function parseEvent(raw: string): RealtimeEvent | undefined {
  const lines = raw.split("\n");
  let event: string | undefined;
  let id: string | undefined;
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith(":")) continue; // comment / heartbeat
    const [field, ...rest] = line.split(":");
    const val = rest.join(":").replace(/^ /, "");
    if (field === "event") event = val;
    else if (field === "id") id = val;
    else if (field === "data") dataLines.push(val);
  }
  if (dataLines.length === 0 && !event) return undefined;
  return { event, id, data: dataLines.join("\n") };
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const ctrl = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      ctrl.abort();
      break;
    }
    s.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  return ctrl.signal;
}
