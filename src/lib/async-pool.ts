/** Run async work with bounded concurrency. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R | null>,
  concurrency: number,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: (R | null)[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i], i);
      } catch {
        results[i] = null;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results.filter((r): r is R => r != null);
}
