import type { HttpClient } from "../http.js";
import type { RewardsLeaderboardRow } from "../types.js";

export class RewardsResource {
  constructor(private readonly http: HttpClient) {}

  leaderboard(params: Record<string, unknown> = {}): Promise<{ items: RewardsLeaderboardRow[] }> {
    return this.http.get<{ items: RewardsLeaderboardRow[] }>("/rewards/leaderboard", { query: params, auth: false });
  }
  account<T = unknown>(wallet: string): Promise<T> {
    return this.http.get<T>(`/rewards/account/${wallet}`, { auth: false });
  }
  ledger<T = unknown>(wallet: string): Promise<T> {
    return this.http.get<T>(`/rewards/ledger/${wallet}`, { auth: false });
  }
  invites<T = unknown>(wallet: string): Promise<T> {
    return this.http.get<T>(`/rewards/invites/${wallet}`, { auth: false });
  }
  /** Session: the signed-in account's invite code. */
  myInviteCode<T = unknown>(): Promise<T> {
    return this.http.get<T>("/me/rewards/invite-code");
  }
}
