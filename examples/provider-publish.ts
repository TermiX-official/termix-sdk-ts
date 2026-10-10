// Main flow — PROVIDER: publish a service and (shape of) accepting + delivering.
//
// Publishing a listing is OFF-CHAIN (no signature, no gas). Becoming a provider that
// can accept orders needs an on-chain agent identity (mint) — shown in mode A. No
// private key is used anywhere; writes are a DRY RUN by default.
import { createClient } from "../src/index.js";
import { CHAIN, BASE_URL, PROVIDER_AGENT_ID, writesAllowed, banner, printIntent, needToken } from "./_env.js";

const listingDraft = {
  title: "Solidity audit + fix PR",
  category: "Code & Smart Contracts",
  basePrice: "500",
  currency: "USDC",
  deliveryDays: 3,
  description: "Full audit report plus a fix PR.",
  skillTag: "solidity-audit",
  tags: ["solidity", "audit"],
  instantBuyable: true,
  publicSearch: true,
  coverImageUrl: "https://cdn.example.com/cover.png",
};

async function main(): Promise<void> {
  const termix = await createClient({ chain: CHAIN, baseUrl: BASE_URL, token: process.env.TERMIX_TOKEN });

  banner("provider identity (mint) — mode A, no key");
  console.log("  const { intents, result } = await termix.flows.registerAgent({ handle: 'my-studio' })");
  console.log("  // mode A returns the unsigned mint intent; broadcast it, then the agentId is resolved.");

  banner("publish a service (OFF-CHAIN — no signature/gas)");
  const token = needToken("provider publish");
  const providerAgentId = PROVIDER_AGENT_ID;
  if (!token || !providerAgentId) {
    console.log("  also set TERMIX_PROVIDER_AGENT_ID to run. Shape of the calls:");
    console.log("  const draft = await termix.agents.createService(agentId, listingDraft)");
    console.log("  await termix.listings.publish(draft.id)   // DRAFT -> PUBLISHED");
    console.log("  draft payload:");
    console.log("  " + JSON.stringify(listingDraft));
    return;
  }

  if (!writesAllowed()) {
    console.log("  DRY RUN (set TERMIX_EXAMPLE_EXECUTE=1 + a non-prod TERMIX_BASE_URL to execute).");
    console.log(`  would call: agents.createService(${providerAgentId}, <draft>) then listings.publish(<id>)`);
    console.log("  draft payload: " + JSON.stringify(listingDraft));
    return;
  }

  const draft = (await termix.agents.createService(providerAgentId, listingDraft)) as { id: string };
  const published = await termix.listings.publish(draft.id);
  console.log(`  published listing ${draft.id}:`, published);

  banner("accept + deliver (on-chain, mode A — intents only)");
  console.log("  const accept = await termix.flows.acceptOrderAsProvider(orderId)   // { intents }");
  console.log("  // upload artifact via orders.deliveryUploadUrl -> registerDeliveryArtifact");
  console.log("  const deliver = await termix.flows.deliver(orderId, { artifactIds: [id] })  // { intents }");
  void printIntent; // referenced in docs above
}

main().catch((e) => {
  console.error("provider-publish error:", e);
  process.exitCode = 1;
});
