import { describe, it, expect } from "vitest";
import { HttpClient, NotFoundError, ValidationError, ConflictError, TokenStore, AuthResource } from "../src/index.js";
import { jsonResponse, mockFetch } from "./_mock.js";

const base = "http://test.local/api/v1";

describe("HttpClient", () => {
  it("maps status codes to typed errors", async () => {
    const { fetch } = mockFetch({
      "GET /x": () => jsonResponse({ error: { code: "NOT_FOUND", message: "nope" } }, 404),
      "GET /y": () => jsonResponse({ error: { code: "BAD", message: "bad" } }, 400),
      "POST /z": () => jsonResponse({ error: { code: "CONFLICT", message: "conflict" } }, 409),
    });
    const http = new HttpClient({ baseUrl: base, fetchImpl: fetch, maxRetries: 0 });
    await expect(http.get("/x")).rejects.toBeInstanceOf(NotFoundError);
    await expect(http.get("/y")).rejects.toBeInstanceOf(ValidationError);
    await expect(http.post("/z")).rejects.toBeInstanceOf(ConflictError);
  });

  it("retries idempotent GET on 500 then succeeds", async () => {
    const { fetch, calls } = mockFetch({
      "GET /flaky": ({ count }) =>
        count < 3 ? jsonResponse({ error: { code: "X", message: "x" } }, 500) : jsonResponse({ ok: true }),
    });
    const http = new HttpClient({ baseUrl: base, fetchImpl: fetch, maxRetries: 3 });
    const res = await http.get<{ ok: boolean }>("/flaky");
    expect(res.ok).toBe(true);
    expect(calls.filter((c) => c.path === "/flaky").length).toBe(3);
  });

  it("does NOT retry non-idempotent POST on 500", async () => {
    const { fetch, calls } = mockFetch({
      "POST /write": () => jsonResponse({ error: { code: "X", message: "x" } }, 500),
    });
    const http = new HttpClient({ baseUrl: base, fetchImpl: fetch, maxRetries: 3 });
    await expect(http.post("/write")).rejects.toBeTruthy();
    expect(calls.filter((c) => c.path === "/write").length).toBe(1);
  });

  it("refreshes once on 401 then retries", async () => {
    const store = new TokenStore(undefined, "refresh-token");
    const { fetch, calls } = mockFetch({
      "POST /auth/refresh": () => jsonResponse({ token: "new-access" }),
      "GET /secure": ({ count }) =>
        count < 2 ? jsonResponse({ error: { code: "UNAUTH", message: "no" } }, 401) : jsonResponse({ ok: true }),
    });
    const http = new HttpClient({
      baseUrl: base,
      fetchImpl: fetch,
      tokenProvider: () => store.access,
    });
    const auth = new AuthResource(http, store);
    (http as unknown as { opts: { onUnauthorized: () => Promise<boolean> } }).opts.onUnauthorized = () =>
      auth.tryRefresh();
    const res = await http.get<{ ok: boolean }>("/secure");
    expect(res.ok).toBe(true);
    expect(store.access).toBe("new-access");
    expect(calls.filter((c) => c.path === "/secure").length).toBe(2);
  });

  it("DELETE targets the given path (regression: delete dropped its path arg)", async () => {
    const { fetch, calls } = mockFetch({ "DELETE /saved-listings/abc": () => jsonResponse(undefined, 204) });
    const http = new HttpClient({ baseUrl: base, fetchImpl: fetch });
    await http.delete("/saved-listings/abc");
    expect(calls).toEqual([{ method: "DELETE", path: "/saved-listings/abc", body: undefined }]);
  });

  it("redacts Authorization in interceptor logs", async () => {
    const seen: Record<string, string>[] = [];
    const { fetch } = mockFetch({ "GET /p": () => jsonResponse({ ok: true }) });
    const http = new HttpClient({
      baseUrl: base,
      fetchImpl: fetch,
      tokenProvider: () => "secret-token",
      interceptors: [{ onRequest: (r) => void seen.push(r.headers) }],
    });
    await http.get("/p");
    expect(seen[0]?.authorization).toBe("<redacted>");
  });

  it("keeps the request timeout when a caller signal is provided", async () => {
    const caller = new AbortController();
    const fetchImpl = ((_input: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("The operation was aborted", "AbortError")),
          { once: true },
        );
      })) as typeof fetch;
    const http = new HttpClient({ baseUrl: base, fetchImpl, timeoutMs: 10, maxRetries: 0 });

    await expect(http.get("/slow", { signal: caller.signal, idempotent: false })).rejects.toThrow(
      "request timeout",
    );
    expect(caller.signal.aborted).toBe(false);
  });
});
