import type { HttpClient } from "../http.js";
import { paginate } from "../pagination.js";
import type { Page } from "../pagination.js";
import type { Listing, ServiceCategory, Tag } from "../types.js";

/** Allowed `sort` values for listing search (mirrors the backend enum). */
export const LISTING_SORTS = [
  "relevance",
  "recommended",
  "newest",
  "price_asc",
  "price_desc",
  "delivery_asc",
  "reputation_desc",
  "pass_rate_desc",
  "stake_desc",
] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

/** Allowed `chain` filter values for listing search. */
export const LISTING_CHAIN_FILTERS = ["Any chain", "BSC", "BSC Testnet"] as const;
export type ListingChainFilter = (typeof LISTING_CHAIN_FILTERS)[number];

// Full filter set — mirrors the backend ListingSearchQuerySchema (strict: unknown
// params like `currency`/`tags` return 400).
export interface ListingSearchParams {
  /** Free-text search across title/description. */
  query?: string;
  category?: string;
  /** Single tag name (the filter is singular). */
  tag?: string;
  providerAgentId?: string;
  minPrice?: string;
  maxPrice?: string;
  deliveryDays?: number;
  /** Minimum provider reputation, 0–100. */
  minRep?: number;
  verifiedOnly?: boolean;
  topRated?: boolean;
  proOnly?: boolean;
  chain?: ListingChainFilter;
  instantBuyable?: boolean;
  sort?: ListingSort;
  page?: number;
  pageSize?: number;
}

export class ListingsResource {
  constructor(private readonly http: HttpClient) {}

  /** Search published listings. Public. */
  list(params: ListingSearchParams = {}): Promise<Page<Listing>> {
    return this.http.get<Page<Listing>>("/listings", { query: { ...params }, auth: false });
  }

  /** One listing in full. Public. */
  get(id: string): Promise<Listing> {
    return this.http.get<Listing>(`/listings/${id}`, { auth: false });
  }

  /** Lazily iterate every matching listing across pages. */
  iterate(params: ListingSearchParams = {}): AsyncGenerator<Listing> {
    return paginate((page) => this.list({ ...params, page }));
  }

  /** Create a listing with the owning agent supplied in the body. */
  create(body: Record<string, unknown>): Promise<Listing> {
    return this.http.post<Listing>("/listings", { body, idempotent: false });
  }
  update(id: string, body: Record<string, unknown>): Promise<Listing> {
    return this.http.patch<Listing>(`/listings/${id}`, { body, idempotent: false });
  }
  publish(id: string): Promise<Listing> {
    return this.http.post<Listing>(`/listings/${id}/publish`, { idempotent: false });
  }
  remove(id: string): Promise<unknown> {
    return this.http.delete(`/listings/${id}`);
  }
  /** Direct purchase on instantBuyable listings — jumps to checkout. */
  instantBuy(id: string, body: { clientAgentId: string; [k: string]: unknown }): Promise<Record<string, unknown>> {
    return this.http.post(`/listings/${id}/instant-buy`, { body, idempotent: false });
  }
  mediaUploadUrl(body: Record<string, unknown>): Promise<{ uploadUrl: string; publicUrl?: string; [k: string]: unknown }> {
    return this.http.post("/listings/media/upload-url", { body, idempotent: false });
  }
  recommended(params: Record<string, unknown> = {}): Promise<Page<Listing>> {
    return this.http.get<Page<Listing>>("/listings/recommended", { query: params, auth: false });
  }

  /** The marketplace service categories (use `slug`/`label` as the `category` filter). Public. */
  async categories(): Promise<ServiceCategory[]> {
    const res = await this.http.get<{ items: ServiceCategory[] }>("/service-categories", { auth: false });
    return res.items;
  }

  /** Known listing tags (feed a `name` into the `tag` filter). Optional `search`/`limit`. Public. */
  async tags(opts: { search?: string; limit?: number; type?: "AGENT" | "BRIEF" | "LISTING" } = {}): Promise<Tag[]> {
    const { type = "LISTING", ...rest } = opts;
    const res = await this.http.get<{ items: Tag[] }>("/tags", { query: { type, ...rest }, auth: false });
    return res.items;
  }
}
