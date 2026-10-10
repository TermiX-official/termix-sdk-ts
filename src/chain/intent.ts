import type { Signer, TxRequest } from "./signer.js";
import type { TxIntent } from "../types.js";

/** Convert a backend tx-intent into a wallet-ready transaction request. */
export function intentToTxRequest(intent: TxIntent): TxRequest {
  return {
    chainId: intent.chainId,
    to: intent.contract,
    data: intent.callData,
    value: intent.value && intent.value !== "0" ? intent.value : undefined,
  };
}

/** Sign + broadcast an intent with the injected signer (mode B). Returns the tx hash. */
export async function broadcastIntent(signer: Signer, intent: TxIntent): Promise<string> {
  return signer.sendTransaction(intentToTxRequest(intent));
}
