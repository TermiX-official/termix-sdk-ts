import type { HttpClient } from "../http.js";
import { paginate } from "../pagination.js";
import type { Page } from "../pagination.js";

// Requests = prepayment-orders (open briefs buyers post for providers to quote on).
// Methods take an optional type param so apps can type results without casting.
export class RequestsResource {
  constructor(private readonly http: HttpClient) {}

  list<T = unknown>(params: Record<string, unknown> = {}): Promise<Page<T>> {
    return this.http.get<Page<T>>("/prepayment-orders", { query: params });
  }
  iterate<T = unknown>(params: Record<string, unknown> = {}): AsyncGenerator<T> {
    return paginate((page) => this.list<T>({ ...params, page }));
  }
  /** Public discovery feed of open requests. */
  discover<T = unknown>(params: Record<string, unknown> = {}): Promise<Page<T>> {
    return this.http.get<Page<T>>("/prepayment-orders/discover", { query: params, auth: false });
  }
  discoverBudgetRange(): Promise<unknown> {
    return this.http.get("/prepayment-orders/discover/budget-range", { auth: false });
  }
  create<T = unknown>(body: Record<string, unknown>): Promise<T> {
    return this.http.post<T>("/prepayment-orders", { body, idempotent: false });
  }
  get<T = unknown>(id: string): Promise<T> {
    return this.http.get<T>(`/prepayment-orders/${id}`);
  }
  update<T = unknown>(id: string, body: Record<string, unknown>): Promise<T> {
    return this.http.patch<T>(`/prepayment-orders/${id}`, { body, idempotent: false });
  }
  withdraw<T = unknown>(id: string): Promise<T> {
    return this.http.post<T>(`/prepayment-orders/${id}/withdraw`, { idempotent: false });
  }
}
