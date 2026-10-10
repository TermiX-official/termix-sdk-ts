// Money is always a decimal STRING on the wire (backend regex: ^\d+(\.\d{1,6})?$).
// Never use JS `number` for amounts — convert through bigint base units instead.

/** Decimal string -> integer base units (bigint) at the given token decimals. */
export function toBaseUnits(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();
  const neg = trimmed.startsWith("-");
  const s = neg ? trimmed.slice(1) : trimmed;
  const [intPart = "", fracRaw = ""] = s.split(".");
  if (!/^\d+$/.test(intPart) || (fracRaw !== "" && !/^\d+$/.test(fracRaw))) {
    throw new Error(`invalid decimal amount: ${amount}`);
  }
  if (fracRaw.length > decimals) {
    throw new Error(`amount ${amount} has more precision than ${decimals} decimals`);
  }
  const frac = (fracRaw + "0".repeat(decimals)).slice(0, decimals);
  const base = BigInt(intPart) * 10n ** BigInt(decimals) + BigInt(frac || "0");
  return neg ? -base : base;
}

/** Integer base units (bigint) -> canonical decimal string (no trailing zeros). */
export function fromBaseUnits(base: bigint, decimals: number): string {
  const neg = base < 0n;
  const v = neg ? -base : base;
  const d = 10n ** BigInt(decimals);
  const int = (v / d).toString();
  const frac = (v % d).toString().padStart(decimals, "0").replace(/0+$/, "");
  return (neg ? "-" : "") + int + (frac ? "." + frac : "");
}
