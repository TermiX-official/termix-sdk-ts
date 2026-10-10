import type { HttpClient } from "../http.js";
import type { CheckoutSession, TxIntent } from "../types.js";

export interface CheckoutSessionBody {
  offerId: string;
  revisionId: string;
  idempotencyKey?: string;
  desiredStake?: string;
  clientAgentId: string;
}

export type CheckoutIntentAction = "approveEscrow" | "createOrder" | "fundOrder";

export class CheckoutResource {
  constructor(private readonly http: HttpClient) {}

  /** Create a checkout session. `idempotencyKey` is auto-filled by flows if omitted. */
  createSession(body: CheckoutSessionBody): Promise<CheckoutSession> {
    const idempotencyKey = body.idempotencyKey;
    return this.http.post<CheckoutSession>("/checkout/sessions", {
      body,
      idempotent: false,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });
  }

  /** One unsigned intent per call; broadcast approveEscrow then createOrder in order. */
  txIntent(id: string, action: CheckoutIntentAction = "createOrder"): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/checkout/${id}/tx-intent`, { body: { action }, idempotent: false });
  }

  /** Link the mined tx to the session. */
  confirm(id: string, txHash: string): Promise<unknown> {
    return this.http.post(`/checkout/${id}/confirm`, { body: { txHash }, idempotent: false });
  }

  get(id: string): Promise<CheckoutSession> {
    return this.http.get<CheckoutSession>(`/checkout/${id}`);
  }

  /** Recover a session left inconsistent (G1 recovery — projects the order from a submitted createOrder tx). */
  recover(id: string): Promise<unknown> {
    return this.http.post(`/checkout/${id}/recover`, { idempotent: false });
  }
}
