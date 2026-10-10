// Authoritative chain registry (verified against the skill registry aacp-chain.mjs
// and live prod /config/contracts). Each chain is a SEPARATE backend deployment with
// its own database and contracts — never mix accounts/orders across chains.
export type ChainKey = "bsc" | "base" | "rh";

export interface ChainEndpoint {
  key: ChainKey;
  chainId: number;
  label: string;
  /** API host WITHOUT the /api/v1 suffix. */
  host: string;
}

export const CHAINS: Record<ChainKey, ChainEndpoint> = {
  bsc: { key: "bsc", chainId: 56, label: "BNB Chain", host: "https://platform-backend.prod.termix.live" },
  base: { key: "base", chainId: 8453, label: "Base", host: "https://platform-backend-base.prod.termix.live" },
  rh: { key: "rh", chainId: 4663, label: "Robinhood Chain", host: "https://platform-backend-rh.prod.termix.live" },
};

export const DEFAULT_CHAIN: ChainKey = "bsc";

/** Resolve the /api/v1 base URL for a chain, or honor an explicit baseUrl override. */
export function resolveBaseUrl(opts: { chain?: ChainKey; baseUrl?: string }): string {
  if (opts.baseUrl) {
    const b = opts.baseUrl.replace(/\/+$/, "");
    return /\/api\/v\d+$/.test(b) ? b : `${b}/api/v1`;
  }
  const chain = CHAINS[opts.chain ?? DEFAULT_CHAIN];
  return `${chain.host}/api/v1`;
}
