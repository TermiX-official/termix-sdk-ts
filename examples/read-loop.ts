// M1 acceptance: prove the read-only closed loop against prod BSC.
// Assertions target STRUCTURE / INVARIANTS, not volatile values.
// Run: `bun examples/read-loop.ts`  (or AACP_CHAIN / BASE_URL overrides below)
import { createClient, fromBaseUnits, toBaseUnits } from "../src/index.js";
import type { ChainKey } from "../src/index.js";

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown): void {
  const mark = ok ? "✓" : "✗";
  console.log(`  ${mark} ${label}${detail !== undefined ? `  -> ${JSON.stringify(detail)}` : ""}`);
  if (!ok) failures += 1;
}

async function main(): Promise<void> {
  const chain = (process.env.AACP_CHAIN as ChainKey) || "bsc";
  const baseUrl = process.env.BASE_URL || undefined;
  console.log(`\nTermiX Platform SDK — read-loop (chain=${chain}${baseUrl ? `, baseUrl=${baseUrl}` : ""})\n`);

  const termix = await createClient({ chain, baseUrl });

  console.log("config/contracts");
  const cfg = await termix.contracts();
  check("chainId is a number", typeof cfg.chainId === "number", cfg.chainId);
  check("has escrow contract address", typeof cfg.contracts?.escrow?.address === "string", cfg.contracts?.escrow?.address);
  check("settlementCurrency has decimals", typeof cfg.settlementCurrency?.decimals === "number", {
    symbol: cfg.settlementCurrency?.symbol,
    decimals: cfg.settlementCurrency?.decimals,
  });

  console.log("stats/network");
  const stats = await termix.stats.network();
  check("latestBlock is a string", typeof stats.latestBlock === "string", stats.latestBlock);
  check("verifiedAgents is a number", typeof stats.verifiedAgents === "number", stats.verifiedAgents);

  console.log("listings (pageSize=3)");
  const listings = await termix.listings.list({ pageSize: 3 });
  check("pagination wrapper intact", [listings.page, listings.pageSize, listings.total, listings.totalPages].every((n) => typeof n === "number"), {
    page: listings.page,
    pageSize: listings.pageSize,
    total: listings.total,
  });
  check("items is an array", Array.isArray(listings.items), listings.items.length);
  const first = listings.items[0];
  check("item basePrice is a decimal string", typeof first?.basePrice === "string", first?.basePrice);

  if (first) {
    console.log("listings/:id");
    const detail = await termix.listings.get(first.id);
    check("detail id matches", detail.id === first.id, detail.id);
  }

  console.log("explorer/agents (pageSize=3)");
  const agents = await termix.explorer.agents({ pageSize: 3 });
  check("items is an array", Array.isArray(agents.items), agents.items.length);
  check("reputationScore is a number", agents.items.length === 0 || typeof agents.items[0]?.reputationScore === "number");

  console.log("money round-trip (no float)");
  const decimals = cfg.settlementCurrency?.decimals ?? 18;
  const sample = first?.basePrice ?? "1.5";
  const roundTrip = fromBaseUnits(toBaseUnits(sample, decimals), decimals);
  const normalized = sample.includes(".") ? sample.replace(/0+$/, "").replace(/\.$/, "") : sample;
  check("decimal string survives base-unit round-trip", roundTrip === normalized, { in: sample, out: roundTrip });

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILED`}\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error("read-loop crashed:", err);
  process.exitCode = 1;
});
