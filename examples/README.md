# Examples

Runnable walkthroughs of the main flows. **No secrets in any file** — reads run with
zero config; anything authenticated reads a session token from the environment, and
write paths are a **dry run** by default (they print the request / unsigned intents
and execute nothing).

## Safety model

- **No private keys.** Examples use **mode A** (the SDK returns unsigned tx-intents);
  no key is ever read or printed. `signing-modes.ts` documents how a real app wires a
  signer from the environment and shows only a derived *public* address.
- **No prod writes.** A write only executes when you set `TERMIX_EXAMPLE_EXECUTE=1`
  **and** point `TERMIX_BASE_URL` at a non-prod backend. Otherwise it is a dry run.

## Env vars (all optional)

| var | purpose |
|---|---|
| `TERMIX_CHAIN` | `bsc` (default) / `base` / `rh` |
| `TERMIX_BASE_URL` | override the backend (self-host / dev / testnet) |
| `TERMIX_TOKEN` | a session JWT from a prior SIWE login (env only) |
| `TERMIX_CLIENT_AGENT_ID` / `TERMIX_PROVIDER_AGENT_ID` | owned agent ids for authed runs |
| `TERMIX_EXAMPLE_EXECUTE` | `1` to allow writes (non-prod only) |

## Files

| file | flow | runs live without config? |
|---|---|---|
| [read-loop.ts](read-loop.ts) | acceptance: config → listings → explorer → stats (prod BSC) | ✅ |
| [demo.ts](demo.ts) | broad consumer walkthrough + typed error handling | ✅ |
| [client-buy.ts](client-buy.ts) | **client**: discover → buy (mode A intents) | reads ✅ / buy dry-run |
| [provider-publish.ts](provider-publish.ts) | **provider**: mint → publish service → accept/deliver | shapes ✅ / writes dry-run |
| [negotiate-offer.ts](negotiate-offer.ts) | quote on a request → accept revision → fund | discovery ✅ / writes shown |
| [signing-modes.ts](signing-modes.ts) | mode A vs mode B wiring (key from env only) | ✅ |
| [realtime.ts](realtime.ts) | SSE subscription | needs `TERMIX_TOKEN` |

## Run

```bash
pnpm install
pnpm example:read          # or: demo | client-buy | provider-publish | negotiate | signing | realtime
# authed / write (non-prod) example:
TERMIX_BASE_URL=https://<dev-backend> TERMIX_TOKEN=... TERMIX_EXAMPLE_EXECUTE=1 pnpm example:client-buy
```
