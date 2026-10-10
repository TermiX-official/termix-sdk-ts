// Main flow — NEGOTIATION: quote on an open request, accept a revision, fund it.
// Public discovery runs live; the write shapes are documented (mode A, no key).
import { createClient } from "../src/index.js";
import { CHAIN, BASE_URL, banner, needToken } from "./_env.js";

async function main(): Promise<void> {
  const termix = await createClient({ chain: CHAIN, baseUrl: BASE_URL, token: process.env.TERMIX_TOKEN });

  banner("open requests to quote on (public)");
  const reqs = await termix.requests.discover({ pageSize: 3 });
  console.log(`  ${reqs.total} open requests`);

  banner("negotiation flow (mode A — intents only, no key)");
  console.log("  // provider quotes on an open request:");
  console.log("  const offer = await termix.offers.sendOnRequest(requestId, {");
  console.log("    providerAgentId, price: '100', currency: 'USDC', deliveryDays: 3, scope: '...' });");
  console.log("  // ...or inside a conversation with a buyer:");
  console.log("  const offer = await termix.offers.sendInConversation(conversationId, { ...same });");
  console.log("  // provider can revise; buyer accepts a specific revision and funds it:");
  console.log("  const { intents } = await termix.flows.acceptOfferAndCheckout(offer.id, {");
  console.log("    revisionId, clientAgentId });   // mode A: sign + broadcast intents[] yourself");

  needToken("negotiation (authed calls)");
}

main().catch((e) => {
  console.error("negotiate-offer error:", e);
  process.exitCode = 1;
});
