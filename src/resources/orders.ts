import type { HttpClient } from "../http.js";
import { paginate } from "../pagination.js";
import type { Page } from "../pagination.js";
import type { Order, TxIntent, Dispute } from "../types.js";

export interface OrderListParams {
  side?: "client" | "provider";
  status?: string;
  providerAgentId?: string;
  listingId?: string;
  prepaymentOrderId?: string;
  query?: string;
  hasDispute?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface DeliverySubmitBody {
  artifactIds?: string[];
  deliveryHash?: string;
  note?: string;
}

export interface UploadUrlBody {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

// Orders. Reads are public-ish (optionalAuth); every money-moving action returns a
// tx-intent the wallet broadcasts. See flows/ for the orchestrated lifecycle.
export class OrdersResource {
  constructor(private readonly http: HttpClient) {}

  list(params: OrderListParams = {}): Promise<Page<Order>> {
    return this.http.get<Page<Order>>("/orders", { query: { ...params } });
  }
  iterate(params: OrderListParams = {}): AsyncGenerator<Order> {
    return paginate((page) => this.list({ ...params, page }));
  }
  get(id: string): Promise<Order> {
    return this.http.get<Order>(`/orders/${id}`);
  }

  // Provider actions
  providerAccept(id: string): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/orders/${id}/provider-accept/prepare`, { idempotent: false });
  }
  deliveryUploadUrl(id: string, body: UploadUrlBody): Promise<{ uploadUrl: string; [k: string]: unknown }> {
    return this.http.post(`/orders/${id}/delivery/upload-url`, { body, idempotent: false });
  }
  registerDeliveryArtifact(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/orders/${id}/delivery/artifacts`, { body, idempotent: false });
  }
  listDeliveryArtifacts(id: string): Promise<unknown> {
    return this.http.get(`/orders/${id}/delivery/artifacts`);
  }
  submitDelivery(id: string, body: DeliverySubmitBody): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/orders/${id}/delivery/submit`, { body, idempotent: false });
  }
  claimAfterTimeout(id: string): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/orders/${id}/claim-after-timeout/prepare`, { idempotent: false });
  }

  // Buyer actions
  accept(id: string): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/orders/${id}/accept/prepare`, { idempotent: false });
  }
  redo(id: string, body: { note?: string } = {}): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/orders/${id}/redo/prepare`, { body, idempotent: false });
  }
  cancelPending(id: string): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/orders/${id}/cancel-pending/prepare`, { idempotent: false });
  }
  review(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/orders/${id}/review`, { body, idempotent: false });
  }

  // Permissionless
  cancelExpired(id: string): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/orders/${id}/cancel-expired/prepare`, { idempotent: false });
  }

  // Disputes
  openDispute(id: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/orders/${id}/disputes`, { body, idempotent: false });
  }
  dispute(id: string): Promise<Dispute> {
    return this.http.get<Dispute>(`/orders/${id}/dispute`);
  }
}
