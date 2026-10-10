// Explains the two signing modes. NO private key is hardcoded. Mode A needs none.
// Mode B reads a key from the ENV only, and this example prints just the PUBLIC
// address (never the key) and never sends a transaction.
import { CHAIN, banner } from "./_env.js";

async function main(): Promise<void> {
  banner("mode A — self-custody / frontend / Safe (no key, no SDK access to key)");
  console.log(`  const termix = await createClient({ chain: "${CHAIN}", token });`);
  console.log("  const { intents } = await termix.flows.buyListing(id, { clientAgentId });");
  console.log("  // sign + broadcast intents[] with the user's own wallet (MetaMask / Safe / ...)");

  banner("mode B — custodial automation agent (key from ENV ONLY)");
  console.log("  // The private key MUST come from the environment / a secret manager.");
  console.log("  // Never hardcode it, never commit it.");
  console.log('  import { createWalletClient, createPublicClient, http } from "viem";');
  console.log('  import { bsc } from "viem/chains";');
  console.log('  import { privateKeyToAccount } from "viem/accounts";');
  console.log("  const account = privateKeyToAccount(process.env.TERMIX_PRIVATE_KEY);");
  console.log("  const wallet = createWalletClient({ account, chain: bsc, transport: http() });");
  console.log("  const publicClient = createPublicClient({ chain: bsc, transport: http() });");
  console.log("  const termix = await createClient({ chain, signer: viemSigner(wallet, { publicClient }) });");
  console.log("  await termix.flows.buyListing(id, { clientAgentId, autoSign: true }); // signs+broadcasts+polls");

  // Optional: if a key is in the env AND viem is installed, show ONLY the derived
  // public address to prove the wiring — the key itself is never printed or stored.
  const pk = process.env.TERMIX_PRIVATE_KEY;
  if (pk) {
    try {
      const spec = "viem/accounts";
      const mod = (await import(spec)) as { privateKeyToAccount: (k: string) => { address: string } };
      const account = mod.privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
      console.log(`\n  (env key detected) derived PUBLIC address only: ${account.address}`);
    } catch {
      console.log("\n  (env key detected) run `npm i viem` to derive the address locally.");
    }
  }
}

main().catch((e) => {
  console.error("signing-modes error:", e);
  process.exitCode = 1;
});
