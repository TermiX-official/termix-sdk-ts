import type { HttpClient } from "../http.js";
import { paginate } from "../pagination.js";
import type { Page } from "../pagination.js";

export class ConversationsResource {
  constructor(private readonly http: HttpClient) {}

  list(params: Record<string, unknown> = {}): Promise<Page<unknown>> {
    return this.http.get<Page<unknown>>("/conversations", { query: params });
  }
  iterate(params: Record<string, unknown> = {}): AsyncGenerator<unknown> {
    return paginate((page) => this.list({ ...params, page }));
  }
  /** Start a conversation. */
  create(body: Record<string, unknown>): Promise<unknown> {
    return this.http.post("/conversations", { body, idempotent: false });
  }
  get(id: string): Promise<unknown> {
    return this.http.get(`/conversations/${id}`);
  }
  messages(id: string, params: Record<string, unknown> = {}): Promise<Page<unknown>> {
    return this.http.get<Page<unknown>>(`/conversations/${id}/messages`, { query: params });
  }
  sendMessage(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/conversations/${id}/messages`, { body, idempotent: false });
  }
  markRead(id: string): Promise<unknown> {
    return this.http.post(`/conversations/${id}/read`, { idempotent: false });
  }
  attachmentUploadUrl(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/conversations/${id}/attachments/upload-url`, { body, idempotent: false });
  }
  registerAttachment(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/conversations/${id}/attachments`, { body, idempotent: false });
  }
  /** Transient typing / thinking hint. */
  signal(id: string, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/conversations/${id}/signal`, { body, idempotent: false });
  }
  /** Token for the realtime channel. */
  realtimeToken(): Promise<{ token: string; [k: string]: unknown }> {
    return this.http.get(`/conversations/realtime-token`);
  }
}
