import type { HttpClient } from "./http.js";
import type { Signer } from "./chain/signer.js";

/** In-memory token store. Swappable later for persistent storage. */
export class TokenStore {
  constructor(public access?: string, public refresh?: string) {}
  set(access?: string, refresh?: string): void {
    this.access = access;
    if (refresh !== undefined) this.refresh = refresh;
  }
  clear(): void {
    this.access = undefined;
    this.refresh = undefined;
  }
}

export interface SiweLoginParams {
  signer: Signer;
  chainId: number;
  domain?: string;
}

interface NonceResponse {
  nonce: string;
  message?: string;
  domain?: string;
  chainId?: number;
  typedData?: unknown;
  expiresAt?: string;
}
interface WalletLoginResponse {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  [k: string]: unknown;
}

// Auth surface: SIWE wallet login -> JWT (+ refresh). /auth/wallet is strict and
// expects { walletAddress, nonce, signature, domain?, chainId? } — we sign the
// `message` returned by /auth/nonce (eip191 personal_sign) and echo the nonce +
// the domain/chainId the server used so it rebuilds the same message.
export class AuthResource {
  constructor(private readonly http: HttpClient, private readonly store: TokenStore) {}

  get token(): string | undefined {
    return this.store.access;
  }

  nonce(walletAddress: string, opts?: { domain?: string; chainId?: number }): Promise<NonceResponse> {
    return this.http.post<NonceResponse>("/auth/nonce", {
      auth: false,
      idempotent: false,
      body: {
        walletAddress,
        ...(opts?.domain ? { domain: opts.domain } : {}),
        ...(opts?.chainId ? { chainId: opts.chainId } : {}),
      },
    });
  }

  /** Full SIWE handshake: nonce -> sign -> wallet login. Stores access + refresh. */
  async loginWithSiwe(params: SiweLoginParams): Promise<WalletLoginResponse> {
    const address = await params.signer.getAddress();
    const n = await this.nonce(address, { domain: params.domain, chainId: params.chainId });
    const signature = await params.signer.signMessage(n.message ?? n.nonce);
    const res = await this.http.post<WalletLoginResponse>("/auth/wallet", {
      auth: false,
      idempotent: false,
      body: {
        walletAddress: address,
        nonce: n.nonce,
        signature,
        ...(n.domain ? { domain: n.domain } : {}),
        ...(n.chainId ? { chainId: n.chainId } : {}),
      },
    });
    this.store.set(res.token ?? res.accessToken, res.refreshToken);
    return res;
  }

  /** Attempt a refresh; returns true on success (used by HttpClient on 401). */
  async tryRefresh(): Promise<boolean> {
    if (!this.store.refresh) return false;
    try {
      const res = await this.http.post<WalletLoginResponse>("/auth/refresh", {
        auth: false,
        idempotent: false,
        body: { refreshToken: this.store.refresh },
      });
      const access = res.token ?? res.accessToken;
      if (!access) return false;
      this.store.set(access, res.refreshToken ?? this.store.refresh);
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    if (this.store.refresh) {
      try {
        await this.http.post("/auth/logout", { body: { refreshToken: this.store.refresh } });
      } catch {
        // best-effort
      }
    }
    this.store.clear();
  }
}
