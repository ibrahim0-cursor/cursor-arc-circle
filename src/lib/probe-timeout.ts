/** Cap external health probes so /api/status never hangs Vercel/serverless. */

export async function probeWithTimeout<T>(
  fn: () => Promise<T>,
  ms: number,
  fallback: T,
  label?: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } catch (e) {
    if (label) console.warn(`[probe] ${label} failed:`, e);
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
