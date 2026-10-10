import type { HttpClient } from "../http.js";

// Account settings + API key management (programmatic auth alternative to SIWE).
export class SettingsResource {
  constructor(private readonly http: HttpClient) {}

  get(): Promise<unknown> {
    return this.http.get("/settings");
  }
  update(body: Record<string, unknown>): Promise<unknown> {
    return this.http.patch("/settings", { body, idempotent: false });
  }
  apiKeys(): Promise<unknown> {
    return this.http.get("/settings/api-keys");
  }
  rotateApiKey(body: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.post("/settings/api-key/rotate", { body, idempotent: false });
  }
  updateApiKey(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.patch(`/settings/api-keys/${id}`, { body, idempotent: false });
  }
  deleteApiKey(id: string): Promise<unknown> {
    return this.http.delete(`/settings/api-keys/${id}`);
  }
}
