import type { TermixClient } from "../client.js";
import type { TxIntent, Order, CheckoutSession } from "../types.js";
import { broadcastIntent } from "../chain/intent.js";
import { waitFor } from "../chain/waitFor.js";
import type { WaitForOptions } from "../chain/waitFor.js";
import { ChainError, NotFoundError } from "../errors.js";

export interface FlowOptions {
  /** Mode B: sign + broadcast + poll internally. Requires a signer on the client. */
  autoSign?: boolean;
  wait?: WaitForOptions;
}

/** Result of a write flow. In mode A (no autoSign) only the intent(s) are returned. */
export interface FlowResult<T = unknown> {
  intents: TxIntent[];
  txHashes: string[];
  result?: T;
}

function idempotencyKey(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  return `${prefix}-${uuid}`;
}

function extractIntents(resp: unknown): TxIntent[] {
  const out: TxIntent[] = [];
  if (!resp || typeof resp !== "object") return out;
  const r = resp as Record<string, unknown>;
  const push = (v: unknown) => {
    if (v && typeof v === "object" && "callData" in (v as object) && "contract" in (v as object)) {
      out.push(v as TxIntent);
    }
  };
  push(r.bondApprovalTxIntent);
  push(r.openChallenge);
  push(r.txIntent);
  if (Array.isArray(r.txIntents)) r.txIntents.forEach(push);
  push(r); // the response may itself be an intent
  return out;
}

export class Flows {
  constructor(private readonly client: TermixClient) {}

  private async broadcast(intent: TxIntent, autoSign?: boolean): Promise<string | undefined> {
    if (!autoSign) return undefined;
    if (!this.client.signer) throw new ChainError("autoSign requires a signer on the client (mode B)");
    // Some intents (e.g. agent mint /agents/prepare) omit chainId; fill it from config.
    const chainId = intent.chainId || (await this.client.contracts()).chainId;
    return broadcastIntent(this.client.signer, { ...intent, chainId });
  }

  private async safeRead<T>(read: () => Promise<T>): Promise<T | undefined> {
    try {
      return await read();
    } catch (err) {
      if (err instanceof NotFoundError) return undefined;
      throw err;
    }
  }

  /** Mint an agent: name check -> prepare -> (broadcast) -> resolve the minted agent. */
  async registerAgent(params: {
    handle: string;
    mint?: Record<string, unknown>;
    autoSign?: boolean;
    wait?: WaitForOptions;
  }): Promise<FlowResult<unknown>> {
    const avail = (await this.client.agents.nameAvailability(params.handle)) as { available?: boolean };
    if (avail?.available === false) throw new Error(`agent handle not available: ${params.handle}`);
    const intent = await this.client.agents.prepareMint({ name: params.handle, ...(params.mint ?? {}) });
    const txHash = await this.broadcast(intent, params.autoSign);
    if (!txHash) return { intents: [intent], txHashes: [] };
    // The mint tx is broadcast; resolving the agent depends on the indexer, which can
    // lag. Never discard a successful broadcast — return the hash even if resolution
    // times out so the caller can poll agents.byTx(txHash) later.
    let agent: unknown;
    try {
      agent = await waitFor(
        () => this.safeRead(() => this.client.agents.byTx(txHash)),
        (a) => a != null && typeof (a as Record<string, unknown>).id === "string",
        params.wait,
      );
    } catch {
      agent = undefined;
    }
    return { intents: [intent], txHashes: [txHash], result: agent };
  }

  /** Drive a checkout session to a funded order: approveEscrow -> createOrder -> confirm -> poll. */
  async completeCheckout(checkoutId: string, opts: FlowOptions = {}): Promise<FlowResult<Order>> {
    const approve = await this.client.checkout.txIntent(checkoutId, "approveEscrow");
    const approveHash = await this.broadcast(approve, opts.autoSign);
    // createOrder runs transferFrom — the approve MUST be mined first, or it reverts.
    if (approveHash && this.client.signer?.waitForReceipt) {
      await this.client.signer.waitForReceipt(approveHash, approve.chainId);
    }
    const create = await this.client.checkout.txIntent(checkoutId, "createOrder");
    const createHash = await this.broadcast(create, opts.autoSign);

    const intents = [approve, create];
    const txHashes = [approveHash, createHash].filter((h): h is string => Boolean(h));
    if (!createHash) return { intents, txHashes };

    await this.client.checkout.confirm(checkoutId, createHash);
    const session = await waitFor<CheckoutSession>(
      () => this.client.checkout.get(checkoutId),
      (s) => Boolean(s.orderId) || s.status === "CONFIRMED",
      opts.wait,
    );
    const order = session.orderId ? await this.client.orders.get(session.orderId) : undefined;
    return { intents, txHashes, result: order };
  }

  /** Instant-buy an instantBuyable listing straight through to a funded order. */
  async buyListing(
    listingId: string,
    params: { clientAgentId: string; packageId?: string; addonIds?: string[]; proofMethod?: string; note?: string; currency?: string } & FlowOptions,
  ): Promise<FlowResult<Order>> {
    const { autoSign, wait, ...body } = params;
    const res = (await this.client.listings.instantBuy(listingId, body)) as Record<string, unknown>;
    const checkoutId = String(res.checkoutId ?? res.id ?? (res.checkout as Record<string, unknown>)?.id ?? "");
    if (!checkoutId) throw new Error("instant-buy did not return a checkout id");
    return this.completeCheckout(checkoutId, { autoSign, wait });
  }

  /** Accept a negotiated offer revision and fund it. */
  async acceptOfferAndCheckout(
    offerId: string,
    params: { revisionId: string; clientAgentId: string; expectedVersion?: number; desiredStake?: string } & FlowOptions,
  ): Promise<FlowResult<Order>> {
    await this.client.offers.accept(offerId, {
      revisionId: params.revisionId,
      clientAgentId: params.clientAgentId,
      ...(params.expectedVersion !== undefined ? { expectedVersion: params.expectedVersion } : {}),
    });
    const session = await this.client.checkout.createSession({
      offerId,
      revisionId: params.revisionId,
      clientAgentId: params.clientAgentId,
      ...(params.desiredStake ? { desiredStake: params.desiredStake } : {}),
      idempotencyKey: idempotencyKey(`checkout-${offerId}`),
    });
    return this.completeCheckout(session.id, { autoSign: params.autoSign, wait: params.wait });
  }

  /** Provider accepts a funded order on-chain (locks provider stake). */
  async acceptOrderAsProvider(orderId: string, opts: FlowOptions = {}): Promise<FlowResult<Order>> {
    const intent = await this.client.orders.providerAccept(orderId);
    const txHash = await this.broadcast(intent, opts.autoSign);
    if (!txHash) return { intents: [intent], txHashes: [] };
    const order = await waitFor<Order>(
      () => this.client.orders.get(orderId),
      (o) => o.status === "FUNDED" || o.status === "IN_PROGRESS",
      opts.wait,
    );
    return { intents: [intent], txHashes: [txHash], result: order };
  }

  /** Provider submits a delivery (artifacts already registered). */
  async deliver(
    orderId: string,
    params: { artifactIds?: string[]; deliveryHash?: string; note?: string } & FlowOptions,
  ): Promise<FlowResult<Order>> {
    const { autoSign, wait, ...body } = params;
    const intent = await this.client.orders.submitDelivery(orderId, body);
    const txHash = await this.broadcast(intent, autoSign);
    if (!txHash) return { intents: [intent], txHashes: [] };
    const order = await waitFor<Order>(() => this.client.orders.get(orderId), (o) => o.status === "DELIVERED", wait);
    return { intents: [intent], txHashes: [txHash], result: order };
  }

  /** Buyer accepts the delivery — this IS settlement (releaseEscrow). */
  async settle(orderId: string, opts: FlowOptions = {}): Promise<FlowResult<Order>> {
    const intent = await this.client.orders.accept(orderId);
    const txHash = await this.broadcast(intent, opts.autoSign);
    if (!txHash) return { intents: [intent], txHashes: [] };
    const order = await waitFor<Order>(() => this.client.orders.get(orderId), (o) => o.status === "SETTLED", opts.wait);
    return { intents: [intent], txHashes: [txHash], result: order };
  }

  /** Buyer requests one redo. */
  async redo(orderId: string, params: { note?: string } & FlowOptions = {}): Promise<FlowResult<Order>> {
    const intent = await this.client.orders.redo(orderId, { note: params.note });
    const txHash = await this.broadcast(intent, params.autoSign);
    if (!txHash) return { intents: [intent], txHashes: [] };
    const order = await waitFor<Order>(() => this.client.orders.get(orderId), (o) => o.redoUsed === true, params.wait);
    return { intents: [intent], txHashes: [txHash], result: order };
  }

  /** Permissionless: refund a delivery that never arrived before the deadline. */
  async cancelExpired(orderId: string, opts: FlowOptions = {}): Promise<FlowResult<Order>> {
    const intent = await this.client.orders.cancelExpired(orderId);
    const txHash = await this.broadcast(intent, opts.autoSign);
    if (!txHash) return { intents: [intent], txHashes: [] };
    const order = await waitFor<Order>(() => this.client.orders.get(orderId), (o) => o.status === "CANCELLED", opts.wait);
    return { intents: [intent], txHashes: [txHash], result: order };
  }

  /** Provider claims escrow after the challenge window lapses with no buyer action. */
  async claimAfterTimeout(orderId: string, opts: FlowOptions = {}): Promise<FlowResult<Order>> {
    const intent = await this.client.orders.claimAfterTimeout(orderId);
    const txHash = await this.broadcast(intent, opts.autoSign);
    if (!txHash) return { intents: [intent], txHashes: [] };
    const order = await waitFor<Order>(() => this.client.orders.get(orderId), (o) => o.status === "SETTLED", opts.wait);
    return { intents: [intent], txHashes: [txHash], result: order };
  }

  /** Open a challenge: broadcasts bond-approval then openChallenge, polls to IN_DISPUTE. */
  async openDispute(
    orderId: string,
    params: Record<string, unknown> & FlowOptions = {},
  ): Promise<FlowResult<Order>> {
    const { autoSign, wait, ...body } = params;
    const prep = await this.client.orders.openDispute(orderId, body);
    const intents = extractIntents(prep);
    const txHashes: string[] = [];
    if (autoSign) {
      for (let i = 0; i < intents.length; i++) {
        const intent = intents[i]!;
        const h = await this.broadcast(intent, true);
        if (h) {
          txHashes.push(h);
          if (i < intents.length - 1 && this.client.signer?.waitForReceipt) {
            await this.client.signer.waitForReceipt(h, intent.chainId);
          }
        }
      }
    }
    if (!autoSign || txHashes.length === 0) return { intents, txHashes };
    const order = await waitFor<Order>(() => this.client.orders.get(orderId), (o) => o.status === "IN_DISPUTE", wait);
    return { intents, txHashes, result: order };
  }
}
