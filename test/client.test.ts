import { describe, it, expect } from "vitest";
import { createClient } from "../src/index.js";
import { jsonResponse, mockFetch } from "./_mock.js";

describe("config drift / chain mismatch", () => {
  it("warns when backend chainId differs from the named chain", async () => {
    const warned: string[] = [];
    const { fetch } = mockFetch({ "GET /config/contracts": () => jsonResponse({ chainId: 97, contracts: {} }) });
    await createClient({ chain: "bsc", fetchImpl: fetch, onWarning: (m) => warned.push(m) });
    expect(warned.length).toBe(1);
    expect(warned[0]).toMatch(/97/);
  });

  it("does not warn when chainId matches", async () => {
    const warned: string[] = [];
    const { fetch } = mockFetch({ "GET /config/contracts": () => jsonResponse({ chainId: 56, contracts: {} }) });
    await createClient({ chain: "bsc", fetchImpl: fetch, onWarning: (m) => warned.push(m) });
    expect(warned.length).toBe(0);
  });

  it("skips the check for an explicit baseUrl override", async () => {
    const warned: string[] = [];
    const { fetch } = mockFetch({ "GET /config/contracts": () => jsonResponse({ chainId: 97, contracts: {} }) });
    await createClient({ baseUrl: "https://x.example", fetchImpl: fetch, onWarning: (m) => warned.push(m) });
    expect(warned.length).toBe(0);
  });
});

describe("taxonomy lookups", () => {
  it("categories() and tags() unwrap items", async () => {
    const { fetch } = mockFetch({
      "GET /config/contracts": () => jsonResponse({ chainId: 56, contracts: {} }),
      "GET /service-categories": () => jsonResponse({ items: [{ slug: "code", label: "Code & Smart Contracts" }] }),
      "GET /tags": () => jsonResponse({ items: [{ id: "t1", name: "solidity", type: "LISTING" }] }),
    });
    const termix = await createClient({ chain: "bsc", fetchImpl: fetch });
    const cats = await termix.listings.categories();
    const tags = await termix.listings.tags({ search: "sol" });
    expect(cats[0]?.label).toBe("Code & Smart Contracts");
    expect(tags[0]?.name).toBe("solidity");
  });
});
