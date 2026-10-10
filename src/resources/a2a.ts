import type { HttpClient } from "../http.js";

// Agent-to-agent runtime: issue a runtime token for an agent, then read its inbox and
// post replies/signals. These sit outside the session-JWT gate (token-authenticated).
export class A2AResource {
  constructor(private readonly http: HttpClient) {}

  /** Public agent card. */
  card(id: string): Promise<unknown> {
    return this.http.get(`/a2a/agents/${id}/card`, { auth: false });
  }
  /** Session: issue a runtime token for one of your agents. */
  issueToken(agentId: string, body: Record<string, unknown> = {}): Promise<{ token: string; [k: string]: unknown }> {
    return this.http.post(`/a2a/runtime/token/${agentId}`, { body, idempotent: false });
  }
  /** Runtime-token authenticated; pass the token via `runtimeToken`. */
  inbox(runtimeToken: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get("/a2a/runtime/inbox", {
      query: params,
      auth: false,
      headers: { authorization: `Bearer ${runtimeToken}` },
    });
  }
  reply(runtimeToken: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post("/a2a/runtime/reply", {
      body,
      idempotent: false,
      auth: false,
      headers: { authorization: `Bearer ${runtimeToken}` },
    });
  }
  signal(runtimeToken: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post("/a2a/runtime/signal", {
      body,
      idempotent: false,
      auth: false,
      headers: { authorization: `Bearer ${runtimeToken}` },
    });
  }
  contextPack(runtimeToken: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get("/a2a/runtime/context-pack", {
      query: params,
      auth: false,
      headers: { authorization: `Bearer ${runtimeToken}` },
    });
  }
}
