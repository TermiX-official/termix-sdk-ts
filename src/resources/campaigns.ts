import type { HttpClient } from "../http.js";
import { paginate } from "../pagination.js";
import type { Page } from "../pagination.js";
import type { TxIntent } from "../types.js";

// Bounties = campaigns with claimable slots. Brand funds a pool; providers claim
// slots, submit proof, get approved/rejected; rejections enter the dispute machinery.
export class CampaignsResource {
  constructor(private readonly http: HttpClient) {}

  list<T = unknown>(params: Record<string, unknown> = {}): Promise<Page<T>> {
    return this.http.get<Page<T>>("/campaigns", { query: params, auth: false });
  }
  iterate<T = unknown>(params: Record<string, unknown> = {}): AsyncGenerator<T> {
    return paginate((page) => this.list<T>({ ...params, page }));
  }
  get<T = unknown>(id: string): Promise<T> {
    return this.http.get<T>(`/campaigns/${id}`, { auth: false });
  }
  rewardRange(): Promise<unknown> {
    return this.http.get("/campaigns/reward-range", { auth: false });
  }
  slots<T = unknown>(id: string, params: Record<string, unknown> = {}): Promise<Page<T>> {
    return this.http.get<Page<T>>(`/campaigns/${id}/slots`, { query: params, auth: false });
  }
  slot<T = unknown>(slotId: string): Promise<T> {
    return this.http.get<T>(`/campaigns/slots/${slotId}`);
  }

  // Brand lifecycle (fund -> manage)
  prepare(body: Record<string, unknown>): Promise<TxIntent> {
    return this.http.post<TxIntent>("/campaigns/prepare", { body, idempotent: false });
  }
  confirmFunded(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/campaigns/${id}/confirm-funded`, { body, idempotent: false });
  }
  pause(id: string): Promise<unknown> {
    return this.http.patch(`/campaigns/${id}/pause`, { idempotent: false });
  }
  resume(id: string): Promise<unknown> {
    return this.http.patch(`/campaigns/${id}/resume`, { idempotent: false });
  }
  reclaimExpiredConfirm(body: Record<string, unknown>): Promise<unknown> {
    return this.http.post("/campaigns/reclaim-expired/confirm", { body, idempotent: false });
  }

  // Provider slot flow
  claim(id: string, body: Record<string, unknown> = {}): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/campaigns/${id}/claim`, { body, idempotent: false });
  }
  confirmClaim(body: Record<string, unknown>): Promise<unknown> {
    return this.http.post("/campaigns/slots/claim/confirm", { body, idempotent: false });
  }
  proofUploadUrl(slotId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/campaigns/slots/${slotId}/proof/upload-url`, { body, idempotent: false });
  }
  submitProof(slotId: string, body: Record<string, unknown>): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/campaigns/slots/${slotId}/submit-proof`, { body, idempotent: false });
  }
  confirmSubmit(body: Record<string, unknown>): Promise<unknown> {
    return this.http.post("/campaigns/slots/submit/confirm", { body, idempotent: false });
  }
  claimSlotAfterTimeout(slotId: string): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/campaigns/slots/${slotId}/claim-after-timeout`, { idempotent: false });
  }
  confirmClaimTimeout(slotId: string, body: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.post(`/campaigns/slots/${slotId}/confirm-claim-timeout`, { body, idempotent: false });
  }

  // Brand review of a submitted slot
  approveSlot(slotId: string, body: Record<string, unknown> = {}): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/campaigns/slots/${slotId}/approve`, { body, idempotent: false });
  }
  confirmApprove(slotId: string, body: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.post(`/campaigns/slots/${slotId}/confirm-approve`, { body, idempotent: false });
  }
  rejectSlot(slotId: string, body: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.post(`/campaigns/slots/${slotId}/reject`, { body, idempotent: false });
  }
  confirmReject(slotId: string, body: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.post(`/campaigns/slots/${slotId}/confirm-reject`, { body, idempotent: false });
  }
  finalizeReject(slotId: string, body: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.post(`/campaigns/slots/${slotId}/finalize-reject`, { body, idempotent: false });
  }
  requestChanges(slotId: string, body: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.post(`/campaigns/slots/${slotId}/request-changes`, { body, idempotent: false });
  }
  confirmRequestChanges(slotId: string, body: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.post(`/campaigns/slots/${slotId}/confirm-request-changes`, { body, idempotent: false });
  }
  removeExpiredSlot(slotId: string, body: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.post(`/campaigns/slots/${slotId}/remove-expired`, { body, idempotent: false });
  }

  /** A rejected slot enters the dispute machinery; returns disputeId + challenge intent. */
  challengeSlot(slotId: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    return this.http.post(`/campaigns/slots/${slotId}/challenge`, { body, idempotent: false });
  }
}
