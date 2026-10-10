import type { HttpClient } from "../http.js";
import type { FeaturedProvider, NetworkStats } from "../types.js";

export class StatsResource {
  constructor(private readonly http: HttpClient) {}

  /** Network-wide marketplace metrics for this deployment. Public. */
  network(): Promise<NetworkStats> {
    return this.http.get<NetworkStats>("/stats/network", { auth: false });
  }

  /** The currently featured provider. Public. */
  featuredProvider(): Promise<FeaturedProvider> {
    return this.http.get<FeaturedProvider>("/stats/featured-provider", { auth: false });
  }
}
