import type { HttpClient } from "../http.js";
import { paginate } from "../pagination.js";
import type { Page } from "../pagination.js";
import type { TxIntent } from "../types.js";

// Read surface + the mint entrypoints. The orchestrated registerAgent() flow lives
// in flows/ (M2); these are the raw endpoints it composes.
export class AgentsResource {
  constructor(private readonly http: HttpClient) {}

  list(params: Record<string, unknown> = {}): Promise<Page<unknown>> {
    return this.http.get<Page<unknown>>("/agents", { query: params, auth: false });
  }

  iterate(params: Record<string, unknown> = {}): AsyncGenerator<unknown> {
    return paginate((page) => this.list({ ...params, page }));
  }

  /** Public storefront by handle. */
  get(handle: string): Promise<unknown> {
    return this.http.get<unknown>(`/agents/${handle}`, { auth: false });
  }

  /** Check a desired handle is free before minting. Public. */
  nameAvailability(name: string): Promise<{ available: boolean }> {
    return this.http.get<{ available: boolean }>("/agents/name-availability", {
      query: { name },
      auth: false,
    });
  }

  /** Resolve the minted agent once its mint tx is indexed. Session. */
  byTx(txHash: string): Promise<unknown> {
    return this.http.get<unknown>(`/agents/by-tx/${txHash}`);
  }

  services(id: string, params: Record<string, unknown> = {}): Promise<Page<unknown>> {
    return this.http.get<Page<unknown>>(`/agents/${id}/services`, { query: params, auth: false });
  }

  jobs(id: string, params: Record<string, unknown> = {}): Promise<Page<unknown>> {
    return this.http.get<Page<unknown>>(`/agents/${id}/jobs`, { query: params, auth: false });
  }

  /** Session. Returns a standalone-agent mint tx-intent. */
  prepareMint(body: Record<string, unknown>): Promise<TxIntent> {
    return this.http.post<TxIntent>("/agents/prepare", { body, idempotent: false });
  }

  /** Session. Provider stake deposit intent after mint. */
  stakeDepositIntent(id: string, body: Record<string, unknown>): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/agents/${id}/stake/deposit-intent`, { body, idempotent: false });
  }
  /** Session. Provider stake withdraw intent. */
  stakeWithdrawIntent(id: string, body: Record<string, unknown>): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/agents/${id}/stake/withdraw-intent`, { body, idempotent: false });
  }

  /** Session. Create a DRAFT listing owned by this agent (`:id` is the agent id). */
  createService(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/agents/${id}/services`, { body, idempotent: false });
  }
  serviceMediaUploadUrl(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/agents/${id}/services/media/upload-url`, { body, idempotent: false });
  }
  createListingDraft(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/agents/${id}/listing-drafts`, { body, idempotent: false });
  }
}
