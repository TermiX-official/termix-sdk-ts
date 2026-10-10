import type { HttpClient } from "../http.js";

export class MetricsResource {
  constructor(private readonly http: HttpClient) {}

  clientSpending<T = unknown>(params: Record<string, unknown> = {}): Promise<T> {
    return this.http.get<T>("/metrics/client/spending", { query: params });
  }
  providerTreasury<T = unknown>(params: Record<string, unknown> = {}): Promise<T> {
    return this.http.get<T>("/metrics/provider/treasury", { query: params });
  }
  providerPerformance<T = unknown>(params: Record<string, unknown> = {}): Promise<T> {
    return this.http.get<T>("/metrics/provider/performance", { query: params });
  }
  providerActivity<T = unknown>(params: Record<string, unknown> = {}): Promise<T> {
    return this.http.get<T>("/metrics/provider/activity", { query: params });
  }
}
