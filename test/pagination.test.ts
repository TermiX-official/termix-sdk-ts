import { describe, it, expect } from "vitest";
import { paginate, collect } from "../src/index.js";
import type { Page } from "../src/index.js";

function fakePage(page: number): Promise<Page<number>> {
  const pageSize = 2;
  const total = 5;
  const totalPages = 3;
  const start = (page - 1) * pageSize;
  const items = [start, start + 1].filter((n) => n < total);
  return Promise.resolve({ items, page, pageSize, total, totalPages });
}

describe("pagination", () => {
  it("walks every page", async () => {
    const all = await collect(paginate(fakePage));
    expect(all).toEqual([0, 1, 2, 3, 4]);
  });

  it("respects a collect limit", async () => {
    const some = await collect(paginate(fakePage), 3);
    expect(some).toEqual([0, 1, 2]);
  });
});
