#!/usr/bin/env bash
# Cross-language conformance (M6): run the identical live read scenario through the
# TypeScript, Python, and Go SDKs. All three assert the SAME structural invariants
# (chainId, escrow address, settlement decimals, latestBlock, pagination wrapper,
# listing detail round-trip, explorer items, money round-trip), so behavioral parity
# means every SDK must print "ALL PASS" against the same backend.
#
# Usage: TERMIX_CHAIN=bsc bash conformance/run.sh
set -uo pipefail

ts_root="$(cd "$(dirname "$0")/.." && pwd)"
base="$(cd "$ts_root/.." && pwd)"
py_root="$base/termix-platform-sdk-python"
go_root="$base/termix-platform-sdk-go"

fail=0
run() {
  local name="$1"; shift
  local out
  out="$("$@" 2>&1)"
  if grep -q "ALL PASS" <<<"$out"; then
    echo "✓ $name — ALL PASS"
  else
    echo "✗ $name"
    tail -6 <<<"$out"
    fail=$((fail + 1))
  fi
}

echo "Cross-language conformance (chain=${TERMIX_CHAIN:-bsc})"
run "TypeScript" bash -c "cd '$ts_root' && pnpm -s example:read"
run "Python" bash -c "cd '$py_root' && . .venv/bin/activate 2>/dev/null; python examples/read_loop.py"
run "Go" bash -c "cd '$go_root' && go run ./cmd/read-loop"

echo
if [ "$fail" -eq 0 ]; then
  echo "CONFORMANCE PASS — TS / Python / Go behave identically on the read scenario"
else
  echo "CONFORMANCE FAIL ($fail of 3)"
  exit 1
fi
