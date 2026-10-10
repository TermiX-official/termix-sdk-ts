import type { HttpClient } from "../http.js";

// Account dashboards, profile, wallets, saved listings, and misc marketplace lookups.
export class AccountResource {
  constructor(private readonly http: HttpClient) {}

  // Dashboards / identity
  dashboard<T = unknown>(): Promise<T> {
    return this.http.get<T>("/dashboard");
  }
  me<T = unknown>(): Promise<T> {
    return this.http.get<T>("/me");
  }
  updateMe<T = unknown>(body: Record<string, unknown>): Promise<T> {
    return this.http.patch<T>("/me", { body, idempotent: false });
  }
  profile<T = unknown>(): Promise<T> {
    return this.http.get<T>("/me/profile");
  }
  walletBalance<T = unknown>(): Promise<T> {
    return this.http.get<T>("/me/wallet/balance");
  }

  // Wallets
  wallets(): Promise<unknown> {
    return this.http.get("/wallets");
  }
  walletActivities(params: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get("/wallets/activities", { query: params });
  }
  walletLedger(params: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get("/wallets/ledger", { query: params });
  }

  // Accounts (public)
  account(id: string): Promise<unknown> {
    return this.http.get(`/accounts/${id}`, { auth: false });
  }
  accountAgents(id: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get(`/accounts/${id}/agents`, { query: params, auth: false });
  }

  // Saved listings
  savedListings(): Promise<unknown> {
    return this.http.get("/saved-listings");
  }
  saveListing(id: string): Promise<unknown> {
    return this.http.post(`/saved-listings/${id}`, { idempotent: true });
  }
  unsaveListing(id: string): Promise<unknown> {
    return this.http.delete(`/saved-listings/${id}`);
  }

  // Marketplace lookups (public)
  compare(listingIds: string[]): Promise<unknown> {
    return this.http.get("/compare", { query: { listingIds: listingIds.join(",") }, auth: false });
  }
  serviceCategories(): Promise<unknown> {
    return this.http.get("/service-categories", { auth: false });
  }
  /** `type` is required: AGENT | BRIEF | LISTING. */
  tags(type: "AGENT" | "BRIEF" | "LISTING", search?: string): Promise<unknown> {
    return this.http.get("/tags", { query: { type, ...(search ? { search } : {}) }, auth: false });
  }
  priceRange(): Promise<unknown> {
    return this.http.get("/listings/price-range", { auth: false });
  }
  recommendedListings(params: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get("/listings/recommended", { query: params, auth: false });
  }

  // On-chain tx status (generic)
  onchainTx(txHash: string): Promise<unknown> {
    return this.http.get(`/onchain/tx/${txHash}`);
  }

  // Orders with message threads
  messagingOrders(params: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get("/messaging/orders", { query: params });
  }
}
