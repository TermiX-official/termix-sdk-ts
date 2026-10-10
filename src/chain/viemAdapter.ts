import type { Signer, TxRequest } from "./signer.js";

// Default Signer adapter for viem — matches the platform frontend/admin stack
// (viem^2 + wagmi^2). We depend on viem only STRUCTURALLY (no import), so viem stays
// an optional peer dependency and the read path pulls in nothing.
export interface ViemAccountLike {
  address: string;
}
export interface ViemWalletClientLike {
  account?: ViemAccountLike | null;
  signMessage(args: { account?: unknown; message: string }): Promise<string>;
  sendTransaction(args: {
    account?: unknown;
    to: string;
    data?: string;
    value?: bigint;
    chainId?: number;
  }): Promise<string>;
}

export interface ViemPublicClientLike {
  waitForTransactionReceipt(args: { hash: string }): Promise<unknown>;
}

export interface ViemSignerOptions {
  account?: ViemAccountLike;
  /** A viem PublicClient — enables waitForReceipt, which checkout mode B needs. */
  publicClient?: ViemPublicClientLike;
}

/** Wrap a viem WalletClient (with an account) as a Signer. Pass a publicClient to
 *  enable receipt-waiting (required for correct approve->createOrder ordering). */
export function viemSigner(wallet: ViemWalletClientLike, opts: ViemSignerOptions = {}): Signer {
  const acct = opts.account ?? wallet.account ?? undefined;
  const signer: Signer = {
    async getAddress(): Promise<string> {
      const address = opts.account?.address ?? wallet.account?.address;
      if (!address) throw new Error("viemSigner: no account on the wallet client");
      return address;
    },
    signMessage(message: string): Promise<string> {
      return wallet.signMessage({ account: acct, message });
    },
    sendTransaction(tx: TxRequest): Promise<string> {
      return wallet.sendTransaction({
        account: acct,
        to: tx.to,
        data: tx.data,
        value: tx.value && tx.value !== "0" ? BigInt(tx.value) : undefined,
        chainId: tx.chainId,
      });
    },
  };
  if (opts.publicClient) {
    const pc = opts.publicClient;
    signer.waitForReceipt = async (hash: string): Promise<void> => {
      await pc.waitForTransactionReceipt({ hash });
    };
  }
  return signer;
}
