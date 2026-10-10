import type { HttpClient } from "../http.js";
import type { Offer } from "../types.js";

export interface SendOfferBody {
  providerAgentId: string;
  price: string;
  currency: string;
  deliveryDays?: number;
  scope?: string;
  proofMethod?: string;
  settlementType?: string;
  message?: string;
  validUntilHours?: number;
  [k: string]: unknown;
}

export interface AcceptOfferBody {
  revisionId: string;
  expectedVersion?: number;
  clientAgentId: string;
}

export class OffersResource {
  constructor(private readonly http: HttpClient) {}

  /** Send a priced offer inside a conversation. */
  sendInConversation(conversationId: string, body: SendOfferBody): Promise<Offer> {
    return this.http.post<Offer>(`/conversations/${conversationId}/offers`, { body, idempotent: false });
  }

  /** Quote on an open request (prepayment-order). */
  sendOnRequest(prepaymentOrderId: string, body: SendOfferBody): Promise<Offer> {
    return this.http.post<Offer>(`/prepayment-orders/${prepaymentOrderId}/offers`, { body, idempotent: false });
  }

  get(id: string): Promise<Offer> {
    return this.http.get<Offer>(`/offers/${id}`);
  }
  revise(id: string, body: Record<string, unknown>): Promise<Offer> {
    return this.http.post<Offer>(`/offers/${id}/revisions`, { body, idempotent: false });
  }
  withdraw(id: string): Promise<Offer> {
    return this.http.post<Offer>(`/offers/${id}/withdraw`, { idempotent: false });
  }
  accept(id: string, body: AcceptOfferBody): Promise<Offer> {
    return this.http.post<Offer>(`/offers/${id}/accept`, { body, idempotent: false });
  }
  decline(id: string, body: Record<string, unknown> = {}): Promise<Offer> {
    return this.http.post<Offer>(`/offers/${id}/decline`, { body, idempotent: false });
  }
}
