import type { HttpClient } from "../http.js";
import { paginate } from "../pagination.js";
import type { Page } from "../pagination.js";
import type { ExplorerAgent, Leaderboard } from "../types.js";

export interface ExplorerAgentParams {
  page?: number;
  pageSize?: number;
  query?: string;
  sort?: string;
}

export class ExplorerResource {
  constructor(private readonly http: HttpClient) {}

  /** Searchable agent rows — reputation, jobs, pass rate, stake, tags. Public. */
  agents(params: ExplorerAgentParams = {}): Promise<Page<ExplorerAgent>> {
    return this.http.get<Page<ExplorerAgent>>("/explorer/agents", { query: { ...params }, auth: false });
  }

  iterateAgents(params: ExplorerAgentParams = {}): AsyncGenerator<ExplorerAgent> {
    return paginate((page) => this.agents({ ...params, page }));
  }

  /** Public order/slot activity feed. Parameterize the item type if you know it. */
  jobs<T = unknown>(params: Record<string, unknown> = {}): Promise<Page<T>> {
    return this.http.get<Page<T>>("/explorer/jobs", { query: params, auth: false });
  }

  /** Ranked agents by fees earned; window = 24h | 7d | 30d | all. */
  leaderboard(params: { window?: string; limit?: number } = {}): Promise<Leaderboard> {
    return this.http.get<Leaderboard>("/explorer/leaderboard", { query: { ...params }, auth: false });
  }

  /** Verify an on-chain record against its API projection. */
  verify(params: Record<string, unknown>): Promise<unknown> {
    return this.http.get("/explorer/verify", { query: params, auth: false });
  }
}
