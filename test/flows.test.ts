import { describe, it, expect } from "vitest";
import { TermixClient } from "../src/index.js";
import { jsonResponse, mockFetch, mockSigner } from "./_mock.js";

const base = "http://test.local/api/v1";
const fastWait = { intervalMs: 1, timeoutMs: 2000 };
const intent = (action: string) => ({
  id: `intent-${action}`,
  accountId: "acc",
  action,
  chainId: 56,
  contract: "0x00000000000000000000000000000000000000ee",
  callData: "0xdeadbeef",
  value: "0",
  status: "PREPARED",
  nonceKey: `k-${action}`,
  createdAt: "2026-10-08T00:00:00.000Z",
});

describe("flows.completeCheckout", () => {
  it("mode B signs approve+create, confirms, and polls to a settled order", async () => {
    let orderStatus = "PENDING_ACCEPT";
    const { fetch, calls } = mockFetch({
      "POST /checkout/c1/tx-intent": ({ body }) => jsonResponse(intent((body as { action: string }).action)),
      "POST /checkout/c1/confirm": () => jsonResponse({ ok: true }),
      "GET /checkout/c1": () => jsonResponse({ id: "c1", amount: "10", currency: "USDC", status: "CONFIRMED", orderId: "o1" }),
      "GET /orders/o1": () => {
        const s = orderStatus;
        orderStatus = "SETTLED";
        return jsonResponse({ id: "o1", status: s, budget: "10", currency: "USDC" });
      },
    });
    const client = new TermixClient({ baseUrl: base, fetchImpl: fetch, signer: mockSigner() });
    const res = await client.flows.completeCheckout("c1", { autoSign: true, wait: fastWait });
    expect(res.txHashes.length).toBe(2);
    expect((res.result as { id: string }).id).toBe("o1");
    expect(calls.some((c) => c.path === "/checkout/c1/confirm")).toBe(true);
  });

  it("waits for the approve receipt before broadcasting createOrder (mode B)", async () => {
    const order: string[] = [];
    const { fetch } = mockFetch({
      "POST /checkout/c1/tx-intent": ({ body }) => {
        order.push(`intent:${(body as { action: string }).action}`);
        return jsonResponse(intent((body as { action: string }).action));
      },
      "POST /checkout/c1/confirm": () => jsonResponse({ ok: true }),
      "GET /checkout/c1": () => jsonResponse({ id: "c1", amount: "10", currency: "USDC", status: "CONFIRMED", orderId: "o1" }),
      "GET /orders/o1": () => jsonResponse({ id: "o1", status: "SETTLED", budget: "10", currency: "USDC" }),
    });
    const signer = mockSigner({ withReceipt: true });
    const client = new TermixClient({ baseUrl: base, fetchImpl: fetch, signer });
    await client.flows.completeCheckout("c1", { autoSign: true, wait: fastWait });
    // the approve receipt must be awaited before the createOrder intent is requested
    const approveSend = signer.events.findIndex((e) => e.startsWith("send:"));
    const approveReceipt = signer.events.findIndex((e) => e.startsWith("receipt:"));
    const createIntentIdx = order.indexOf("intent:createOrder");
    const approveIntentIdx = order.indexOf("intent:approveEscrow");
    expect(approveIntentIdx).toBeLessThan(createIntentIdx);
    expect(approveReceipt).toBeGreaterThan(approveSend);
    expect(signer.events[approveReceipt]).toBe(signer.events[approveSend]!.replace("send:", "receipt:"));
  });

  it("mode A returns both intents and broadcasts nothing", async () => {
    const { fetch } = mockFetch({
      "POST /checkout/c1/tx-intent": ({ body }) => jsonResponse(intent((body as { action: string }).action)),
    });
    const client = new TermixClient({ baseUrl: base, fetchImpl: fetch }); // no signer
    const res = await client.flows.completeCheckout("c1");
    expect(res.intents.length).toBe(2);
    expect(res.txHashes.length).toBe(0);
  });
});

describe("flows.registerAgent", () => {
  it("checks name, prepares mint, broadcasts, resolves the agent", async () => {
    let resolved = false;
    const { fetch } = mockFetch({
      "GET /agents/name-availability": () => jsonResponse({ available: true }),
      "POST /agents/prepare": () => jsonResponse(intent("mintAgent")),
      "GET /agents/by-tx/0xddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd1": () => {
        if (!resolved) {
          resolved = true;
          return jsonResponse({ error: { code: "NOT_FOUND", message: "indexing" } }, 404);
        }
        return jsonResponse({ id: "agent-1", handle: "neo" });
      },
    });
    const client = new TermixClient({ baseUrl: base, fetchImpl: fetch, signer: mockSigner() });
    const res = await client.flows.registerAgent({ handle: "neo", autoSign: true, wait: fastWait });
    expect(res.txHashes.length).toBe(1);
    expect((res.result as { id: string }).id).toBe("agent-1");
  });

  it("throws when the handle is taken", async () => {
    const { fetch } = mockFetch({
      "GET /agents/name-availability": () => jsonResponse({ available: false }),
    });
    const client = new TermixClient({ baseUrl: base, fetchImpl: fetch, signer: mockSigner() });
    await expect(client.flows.registerAgent({ handle: "taken", autoSign: true })).rejects.toThrow(/not available/);
  });
});

describe("flows.buyListing", () => {
  it("instant-buys then completes checkout", async () => {
    let orderStatus = "PENDING_ACCEPT";
    const { fetch } = mockFetch({
      "POST /listings/l1/instant-buy": () => jsonResponse({ checkoutId: "c9" }),
      "POST /checkout/c9/tx-intent": ({ body }) => jsonResponse(intent((body as { action: string }).action)),
      "POST /checkout/c9/confirm": () => jsonResponse({ ok: true }),
      "GET /checkout/c9": () => jsonResponse({ id: "c9", amount: "1", currency: "USDC", status: "CONFIRMED", orderId: "o9" }),
      "GET /orders/o9": () => {
        const s = orderStatus;
        orderStatus = "SETTLED";
        return jsonResponse({ id: "o9", status: s, budget: "1", currency: "USDC" });
      },
    });
    const client = new TermixClient({ baseUrl: base, fetchImpl: fetch, signer: mockSigner() });
    const res = await client.flows.buyListing("l1", { clientAgentId: "a1", autoSign: true, wait: fastWait });
    expect((res.result as { id: string }).id).toBe("o9");
  });
});

describe("flows.deliver + settle (mode B)", () => {
  it("submits delivery and polls to DELIVERED", async () => {
    let s = "IN_PROGRESS";
    const { fetch } = mockFetch({
      "POST /orders/o1/delivery/submit": () => jsonResponse(intent("submitDelivery")),
      "GET /orders/o1": () => {
        const cur = s;
        s = "DELIVERED";
        return jsonResponse({ id: "o1", status: cur, budget: "10", currency: "USDC" });
      },
    });
    const client = new TermixClient({ baseUrl: base, fetchImpl: fetch, signer: mockSigner() });
    const res = await client.flows.deliver("o1", { artifactIds: ["art1"], autoSign: true, wait: fastWait });
    expect((res.result as { status: string }).status).toBe("DELIVERED");
  });
});

describe("flows.openDispute", () => {
  it("mode B awaits bondApproval receipt before broadcasting openChallenge", async () => {
    let orderStatus = "DELIVERED";
    const { fetch } = mockFetch({
      "POST /orders/o1/disputes": () => jsonResponse({
        bondApprovalTxIntent: intent("approveBond"),
        openChallenge: intent("openChallenge"),
      }),
      "GET /orders/o1": () => {
        const cur = orderStatus;
        orderStatus = "IN_DISPUTE";
        return jsonResponse({ id: "o1", status: cur, budget: "10", currency: "USDC" });
      },
    });
    const signer = mockSigner({ withReceipt: true });
    const client = new TermixClient({ baseUrl: base, fetchImpl: fetch, signer });
    const res = await client.flows.openDispute("o1", { autoSign: true, wait: fastWait });
    expect(res.txHashes.length).toBe(2);
    expect((res.result as { status: string }).status).toBe("IN_DISPUTE");
    const approveSend = signer.events.indexOf("send:0xddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd1");
    const approveReceipt = signer.events.indexOf("receipt:0xddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd1");
    const openSend = signer.events.indexOf("send:0xddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd2");
    expect(approveSend).toBeGreaterThanOrEqual(0);
    expect(approveReceipt).toBeGreaterThan(approveSend);
    expect(openSend).toBeGreaterThan(approveReceipt);
  });

  it("mode A returns both dispute intents without broadcasting", async () => {
    const { fetch } = mockFetch({
      "POST /orders/o1/disputes": () => jsonResponse({
        bondApprovalTxIntent: intent("approveBond"),
        openChallenge: intent("openChallenge"),
      }),
    });
    const client = new TermixClient({ baseUrl: base, fetchImpl: fetch });
    const res = await client.flows.openDispute("o1");
    expect(res.intents.length).toBe(2);
    expect(res.txHashes.length).toBe(0);
  });
});

