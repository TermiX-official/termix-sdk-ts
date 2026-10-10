import { describe, it, expect } from "vitest";
import { toBaseUnits, fromBaseUnits } from "../src/index.js";

describe("money", () => {
  it("round-trips decimal strings at 18 decimals", () => {
    for (const v of ["0", "1", "1.5", "24.28", "1000000", "0.000001"]) {
      expect(fromBaseUnits(toBaseUnits(v, 18), 18)).toBe(v.replace(/\.0+$/, ""));
    }
  });

  it("converts to exact base units (no float error)", () => {
    expect(toBaseUnits("24.28", 18)).toBe(24_280000000000000000n);
    expect(toBaseUnits("0.1", 6)).toBe(100000n);
  });

  it("rejects over-precise amounts", () => {
    expect(() => toBaseUnits("1.1234567", 6)).toThrow();
    expect(() => toBaseUnits("abc", 18)).toThrow();
  });

  it("handles negatives", () => {
    expect(fromBaseUnits(toBaseUnits("-1.5", 18), 18)).toBe("-1.5");
  });
});
