// Minimal Signer PORT. The SDK never hard-depends on a specific wallet library;
// adapters (viem — default, matching the platform frontend's viem^2+wagmi^2 stack;
// ethers; Safe) implement this interface. Users may also plug KMS / multisig.
// Chain libraries stay OPTIONAL peer deps — the read path needs none.
export interface TxRequest {
  chainId: number;
  to: string;
  data: string;
  value?: string;
}

export interface Signer {
  /** Checksummed EOA/contract address acting as the account. */
  getAddress(): Promise<string>;
  /** Personal-sign a string message (used for SIWE login). */
  signMessage(message: string): Promise<string>;
  /** Broadcast a transaction and resolve the tx hash. */
  sendTransaction(tx: TxRequest): Promise<string>;
  /**
   * Optional: wait until a tx is mined. Flows use it to order DEPENDENT txs —
   * e.g. an ERC-20 `approveEscrow` must be mined before `createOrder` runs
   * `transferFrom`, otherwise createOrder reverts. Provide it (viemSigner with a
   * publicClient) whenever you use mode B for checkout.
   */
  waitForReceipt?(hash: string, chainId: number): Promise<void>;
}
