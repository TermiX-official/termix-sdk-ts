import type { HttpClient } from "../http.js";
import type { Dispute, TxIntent } from "../types.js";

export type VerdictResult = "PROVIDER_UPHELD" | "BUYER_UPHELD" | "SPLIT";

// Dispute reads are participant-scoped (session). Votes/verdicts/settlement are tx-intents.
export class DisputesResource {
  constructor(private readonly http: HttpClient) {}

  get(id: string): Promise<Dispute> {
    return this.http.get<Dispute>(`/disputes/${id}`);
  }
  /** Alias view reached from the resolution id. */
  resolution(id: string): Promise<Dispute> {
    return this.http.get<Dispute>(`/resolutions/${id}`);
  }
  evidenceArtifacts(id: string): Promise<unknown> {
    return this.http.get(`/disputes/${id}/evidence/artifacts`);
  }

  // Evidence
  evidenceUploadUrl(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/disputes/${id}/evidence/upload-url`, { body, idempotent: false });
  }
  registerEvidenceArtifact(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/disputes/${id}/evidence/artifacts`, { body, idempotent: false });
  }
  addEvidencePayload(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/disputes/${id}/evidence-payloads`, { body, idempotent: false });
  }
  /** Evaluator-only: request specific evidence from a party. */
  requestEvidence(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/disputes/${id}/evidence-requests`, { body, idempotent: false });
  }

  // Evaluator verdict -> castVote tx-intent
  castVerdict(id: string, body: { evaluatorAgentId: string; result: VerdictResult }): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/disputes/${id}/verdict`, { body, idempotent: false });
  }

  // Dispute window
  acceptVerdict(id: string): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/disputes/${id}/accept`, { idempotent: false });
  }
  escalate(id: string): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/disputes/${id}/arbitration`, { idempotent: false });
  }
  arbitrationVerdict(id: string, body: Record<string, unknown>): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/disputes/${id}/arbitration/verdict`, { body, idempotent: false });
  }
  finalizeAfterTimeout(id: string): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/disputes/${id}/finalize-after-timeout/prepare`, { idempotent: false });
  }
}

export class EvaluatorResource {
  constructor(private readonly http: HttpClient) {}
  cases(params: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.get("/evaluator/cases", { query: params });
  }
  /** Alias of POST /disputes/:id/verdict. */
  score(caseId: string, body: Record<string, unknown>): Promise<TxIntent> {
    return this.http.post<TxIntent>(`/evaluator/cases/${caseId}/score`, { body, idempotent: false });
  }
}
