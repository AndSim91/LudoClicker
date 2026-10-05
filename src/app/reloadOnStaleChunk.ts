const RELOAD_KEY = "ludoclicker.staleChunkReloadAt";
const RETRY_WINDOW_MS = 30_000;

/**
 * A new deploy deletes the old hashed chunks, so a page opened before it fails to
 * load a lazy view. Reload once (pagehide saves the game, the app is still mounted)
 * to get the new version; if it fails again soon after, it is a real network
 * problem and the error goes on to the crash screen.
 */
export function reloadOnStaleChunk<T>(load: () => Promise<T>, now = Date.now): () => Promise<T> {
  return () =>
    load().catch((error: unknown) => {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
      if (now() - last < RETRY_WINDOW_MS) throw error;
      sessionStorage.setItem(RELOAD_KEY, String(now()));
      window.location.reload();
      return new Promise<T>(() => {}); // keeps Suspense waiting until the page goes away
    });
}
