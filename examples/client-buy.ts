// Main flow — CLIENT: discover a service and buy it.
//
// Reads run live. The purchase is shown in MODE A (no signer, no private key):
// the SDK returns unsigned tx-intents that your own wallet would broadcast.
// By default the write is a DRY RUN (prints the intents, executes nothing).
import { createClient } from "../src/index.js";
import { CHAIN, BASE_URL, CLIENT_AGENT_ID, writesAllowed, banner, printIntent, needToken } from "./_env.js";

async function main(): Promise<void> {
  const termix = await createClient({ chain: CHAIN, baseUrl: BASE_URL, token: process.env.TERMIX_TOKEN });

  banner("find an instant-buyable listing (public read)");
  const page = await termix.listings.list({ instantBuyable: true, pageSize: 5 });
  const target = page.items[0];
  if (!target) {
    console.log("  no instant-buyable listings found");
    return;
  }
  console.log(`  -> ${target.title} — ${target.priceLabel ?? target.basePrice + " " + target.currency} (id ${target.id})`);

  banner("buy it (mode A — returns unsigned intents)");
  const token = needToken("client buy");
  const clientAgentId = CLIENT_AGENT_ID;
  if (!token || !clientAgentId) {
    console.log("  also set TERMIX_CLIENT_AGENT_ID to run. Shape of the call:");
    console.log('  await termix.flows.buyListing(listingId, { clientAgentId })  // mode A: returns { intents }');
    return;
  }

  if (!writesAllowed()) {
    console.log("  DRY RUN (set TERMIX_EXAMPLE_EXECUTE=1 + a non-prod TERMIX_BASE_URL to execute).");
    console.log(`  would call: flows.buyListing(${target.id}, { clientAgentId })`);
    return;
  }

  // Mode A: no signer attached -> flows return the unsigned intents to broadcast.
  const { intents } = await termix.flows.buyListing(target.id, { clientAgentId });
  console.log("  received unsigned intents (sign + broadcast with your wallet, in order):");
  intents.forEach((i, idx) => printIntent(`intent[${idx}]`, i));
}

main().catch((e) => {
  console.error("client-buy error:", e);
  process.exitCode = 1;
});
