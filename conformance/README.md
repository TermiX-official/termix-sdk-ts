# Cross-language conformance (M6)

`run.sh` executes the **same live read scenario** through all three SDKs and requires
behavioral parity. Each SDK's `read-loop` asserts the identical structural invariants:

- `config/contracts`: chainId, escrow address, settlement decimals
- `stats/network`: latestBlock is a string
- `listings`: pagination wrapper + item shape, and `listings/:id` round-trip
- `explorer/agents`: items
- money: decimal → base-units → decimal round-trip (no float)

So "all three print ALL PASS against the same backend" is the conformance gate.

```bash
# assumes the three sibling repos are built/installed:
#   termix-platform-sdk-ts  (pnpm install)
#   termix-platform-sdk-python (.venv with pip install -e '.[dev]')
#   termix-platform-sdk-go  (go toolchain)
TERMIX_CHAIN=bsc bash conformance/run.sh
```

Last run: TS / Python / Go → CONFORMANCE PASS.
