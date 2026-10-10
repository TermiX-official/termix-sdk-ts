import type { Signer, TxRequest } from "../src/index.js";

const NULL_BODY_STATUS = new Set([204, 205, 304]);

export function jsonResponse(body: unknown, status = 200): Response {
  const noBody = NULL_BODY_STATUS.has(status) || body === undefined;
  return new Response(noBody ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export interface MockCall {
  method: string;
  path: string;
  body: unknown;
}

/** Route mock keyed by "METHOD /path" (query stripped). Values can be a fixed
 *  response or a function of call-count for retry scenarios. */
export type Route = (call: MockCall & { count: number }) => Response | Promise<Response>;

export function mockFetch(routes: Record<string, Route>): { fetch: typeof fetch; calls: MockCall[] } {
  const calls: MockCall[] = [];
  const counts: Record<string, number> = {};
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const method = (init?.method ?? "GET").toUpperCase();
    const url = new URL(typeof input === "string" ? input : input.toString());
    const path = url.pathname.replace(/^\/api\/v1/, "");
    const key = `${method} ${path}`;
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, path, body });
    counts[key] = (counts[key] ?? 0) + 1;
    const route = routes[key] ?? routes[`${method} *`];
    if (!route) throw new Error(`unmocked route: ${key}`);
    return route({ method, path, body, count: counts[key]! });
  }) as typeof fetch;
  return { fetch: fetchImpl, calls };
}

export function mockSigner(opts: { withReceipt?: boolean } = {}): Signer & {
  sent: TxRequest[];
  events: string[];
} {
  const sent: TxRequest[] = [];
  const events: string[] = [];
  let n = 0;
  const signer: Signer & { sent: TxRequest[]; events: string[] } = {
    sent,
    events,
    getAddress: async () => "0x00000000000000000000000000000000000000a1",
    signMessage: async () => "0xsignature",
    sendTransaction: async (tx: TxRequest) => {
      sent.push(tx);
      n += 1;
      const hash = `0x${"d".repeat(63)}${n}`;
      events.push(`send:${hash}`);
      return hash;
    },
  };
  if (opts.withReceipt) {
    signer.waitForReceipt = async (hash: string) => {
      events.push(`receipt:${hash}`);
    };
  }
  return signer;
}
