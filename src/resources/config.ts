import type { HttpClient } from "../http.js";
import type { ContractsConfig } from "../types.js";

export class ConfigResource {
  constructor(private readonly http: HttpClient) {}

  /** Chain, fees, currencies, contract addresses for this deployment. Public. */
  contracts(): Promise<ContractsConfig> {
    return this.http.get<ContractsConfig>("/config/contracts", { auth: false });
  }

  /** The canonical service-category enum. Public. */
  serviceCategories(): Promise<unknown> {
    return this.http.get<unknown>("/service-categories", { auth: false });
  }
}
