// Every list endpoint returns the same wrapper; `filters` echoes the applied query.
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  filters?: Record<string, unknown>;
}

export type PageFetcher<T> = (page: number) => Promise<Page<T>>;

/** Lazily walk every page, yielding items one at a time. */
export async function* paginate<T>(fetchPage: PageFetcher<T>, startPage = 1): AsyncGenerator<T> {
  let page = startPage;
  for (;;) {
    const res = await fetchPage(page);
    for (const item of res.items) yield item;
    if (res.items.length === 0 || page >= res.totalPages) break;
    page += 1;
  }
}

/** Collect up to `limit` items from an async generator. */
export async function collect<T>(gen: AsyncGenerator<T>, limit = Number.POSITIVE_INFINITY): Promise<T[]> {
  const out: T[] = [];
  for await (const item of gen) {
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
