// Generic poller. The platform confirms state from on-chain EVENTS, not from the
// broadcast result — only checkout has a /confirm endpoint; orders/disputes are
// projected by the indexer. So flows reconcile by polling a predicate over a fresh
// read, never by trusting the tx receipt alone.
export interface WaitForOptions {
  /** Max total wait in ms (default 120s). */
  timeoutMs?: number;
  /** Delay between polls in ms (default 2s). */
  intervalMs?: number;
  signal?: AbortSignal;
}

export async function waitFor<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  opts: WaitForOptions = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const intervalMs = opts.intervalMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (done(value)) return value;
    if (Date.now() >= deadline) {
      throw new Error(`waitFor: predicate not satisfied within ${timeoutMs}ms`);
    }
    if (opts.signal?.aborted) throw new Error("waitFor: aborted");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
