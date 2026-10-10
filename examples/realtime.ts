// Main flow — REALTIME: subscribe to the SSE event stream (needs a session).
import { createClient } from "../src/index.js";
import { CHAIN, BASE_URL, banner, needToken } from "./_env.js";

async function main(): Promise<void> {
  banner("realtime (Centrifugo SSE)");
  const token = needToken("realtime");
  if (!token) {
    console.log("  shape: const sub = await termix.realtime.subscribe({ onEvent: (e) => ... }); sub.close();");
    return;
  }
  const termix = await createClient({ chain: CHAIN, baseUrl: BASE_URL, token });
  console.log("  subscribing for 10s…");
  const sub = await termix.realtime.subscribe({
    onEvent: (e) => console.log("  event:", e.event ?? "(message)", e.data.slice(0, 120)),
    onError: (err) => console.log("  sse error:", (err as Error).message),
  });
  await new Promise((r) => setTimeout(r, 10_000));
  sub.close();
  console.log("  closed.");
}

main().catch((e) => {
  console.error("realtime error:", e);
  process.exitCode = 1;
});
