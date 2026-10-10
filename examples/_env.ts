// Shared example config. NO SECRETS IN CODE: everything sensitive comes from the
// environment. Private keys are NEVER read here — examples use mode A (unsigned
// intents) so no key is required. See signing-modes.ts for how a signer is wired
// from the environment in a real app.
import type { ChainKey } from "../src/index.js";

export const CHAIN = (process.env.TERMIX_CHAIN as ChainKey) || "bsc";
export const BASE_URL = process.env.TERMIX_BASE_URL || undefined;

/** A pre-obtained session JWT (from a prior SIWE login elsewhere). Env only. */
export const TOKEN = process.env.TERMIX_TOKEN || undefined;

/** Owned agent ids for the client / provider side, if you want to run authed reads. */
export const CLIENT_AGENT_ID = process.env.TERMIX_CLIENT_AGENT_ID || undefined;
export const PROVIDER_AGENT_ID = process.env.TERMIX_PROVIDER_AGENT_ID || undefined;

/**
 * Whether an example may actually EXECUTE a write (create/mint/order). Guarded so
 * examples never mutate production: requires an explicit opt-in AND a non-prod base
 * URL. By default every write path is a dry run that only prints the request shape.
 */
export function writesAllowed(): boolean {
  const execute = process.env.TERMIX_EXAMPLE_EXECUTE === "1";
  return execute && !!BASE_URL && !/prod\.termix\.live/.test(BASE_URL);
}

export function banner(title: string): void {
  console.log(`\n=== ${title} ===`);
}

/** Pretty-print an unsigned tx-intent without leaking anything sensitive. */
export function printIntent(label: string, intent: { action: string; chainId: number; contract: string; value: string; nonceKey: string }): void {
  console.log(`  ${label}: action=${intent.action} chain=${intent.chainId} to=${intent.contract} value=${intent.value} nonceKey=${intent.nonceKey}`);
}

export function needToken(example: string): string | undefined {
  if (!TOKEN) {
    console.log(`  (skipped) ${example} needs an authenticated session.`);
    console.log("  Set TERMIX_TOKEN=<session jwt> (env only, never hardcode) and re-run.");
    return undefined;
  }
  return TOKEN;
}
