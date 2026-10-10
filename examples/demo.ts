// A realistic "consumer" walkthrough of the SDK against prod BSC (reads only).
// Goal: surface DX friction / bugs / awkward business logic. Run: pnpm example:demo
import {
  createClient,
  collect,
  toBaseUnits,
  fromBaseUnits,
  NotFoundError,
  ValidationError,
  TermixApiError,
} from "../src/index.js";

function h(title: string): void {
  console.log(`\n── ${title} ──`);
}

async function main(): Promise<void> {
  // 1. Spin up a client (warms /config/contracts).
  const termix = await createClient({ chain: "bsc" });
  const cfg = await termix.contracts();
  h("marketplace");
  console.log(`chain=${cfg.networkLabel} (#${cfg.chainId}) fee=${cfg.protocolFeeBps}bps settle=${cfg.settlementCurrency.symbol}`);

  // 2. Network pulse.
  const stats = await termix.stats.network();
  console.log(`agents=${stats.verifiedAgents} live=${stats.liveServices} vol=$${stats.totalVolumeUsd} block=${stats.latestBlock}`);

  // 3. Browse the storefront — a buyer looking for a service.
  h("browse listings");
  const page = await termix.listings.list({ pageSize: 5, sort: "newest" });
  console.log(`showing ${page.items.length} of ${page.total} listings`);
  for (const l of page.items) {
    console.log(`  • ${l.title} — ${l.priceLabel ?? l.basePrice + " " + l.currency} by ${l.seller.displayName}`);
  }

  // 3b. Discover the taxonomy (categories + tags) used to filter.
  h("categories & tags");
  const categories = await termix.listings.categories();
  console.log(`${categories.length} categories: ${categories.slice(0, 4).map((c) => c.label).join(" · ")} …`);
  const tags = await termix.listings.tags({ search: "a", limit: 6 });
  console.log(`tags matching "a": ${tags.map((t) => t.name).join(", ")}`);

  // 3c. A precise filtered search using the full filter set (typed sort enum).
  h("filtered search (full filters)");
  const filtered = await termix.listings.list({
    query: "audit",
    instantBuyable: true,
    minRep: 50,
    sort: "reputation_desc",
    pageSize: 3,
  });
  console.log(`query="audit" + instantBuyable + rep≥50 + sort=reputation_desc → ${filtered.total} results`);
  for (const l of filtered.items) console.log(`  • ${l.title} — rep ${l.seller.reputationScore}`);

  // 4. Drill into one.
  const firstId = page.items[0]?.id;
  if (firstId) {
    h("listing detail");
    const listing = await termix.listings.get(firstId);
    console.log(`${listing.title}\n  rep=${listing.seller.reputationScore} jobs=${listing.seller.completedJobs} instantBuy=${listing.instantBuyable}`);
  }

  // 5. Auto-paginate a filtered search (stop at 8).
  h("paginate (first 8 Design listings)");
  const design = await collect(termix.listings.iterate({ category: "Design & Brand", pageSize: 20 }), 8);
  console.log(`collected ${design.length}`);

  // 6. Explorer: who are the top agents? (now fully typed — no cast)
  h("leaderboard");
  const board = await termix.explorer.leaderboard({ window: "7d", limit: 3 });
  for (const r of board.items) console.log(`  #${r.rank} ${r.agentName} — $${r.feesUsd} (rep ${r.reputationScore})`);

  // 7. Open requests a provider could quote on.
  h("open requests (discover)");
  const reqs = await termix.requests.discover({ pageSize: 3 });
  console.log(`open requests: ${reqs.total}`);

  // 8. Bounties.
  h("bounties (campaigns)");
  const camps = await termix.campaigns.list({ pageSize: 3 });
  console.log(`campaigns: ${camps.total}`);

  // 9. Money helper against the real settlement currency.
  h("money (no float)");
  const dec = cfg.settlementCurrency.decimals;
  const base = toBaseUnits("24.28", dec);
  console.log(`24.28 ${cfg.settlementCurrency.symbol} = ${base} base units; back = ${fromBaseUnits(base, dec)}`);

  // 10. Typed error handling — the two a consumer hits most.
  h("error handling");
  try {
    await termix.listings.get("does-not-exist-xxxxx");
  } catch (e) {
    console.log(`  not-found -> ${e instanceof NotFoundError ? "NotFoundError" : (e as Error).name} (${(e as TermixApiError).code})`);
  }
  try {
    // strict schema: `currency` is not an allowed listings filter -> 400
    await termix.listings.list({ currency: "USDC" } as unknown as { pageSize: number });
  } catch (e) {
    console.log(`  bad-filter -> ${e instanceof ValidationError ? "ValidationError" : (e as Error).name} (${(e as TermixApiError).code})`);
  }

  // 11. Mode A preview: what a self-custody buyer would get back (no signer).
  //     (Shown only structurally — requires an authed session to actually call.)
  h("signing modes");
  console.log(`  signer attached? ${termix.signer ? "yes (mode B)" : "no (mode A — flows return unsigned intents)"}`);

  console.log("\n✔ demo complete");
}

main().catch((err) => {
  console.error("demo crashed:", err);
  process.exitCode = 1;
});
