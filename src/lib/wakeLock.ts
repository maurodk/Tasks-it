// Screen Wake Lock helper with safe fallbacks
// Not all browsers support it; we no-op gracefully.

interface MinimalWakeLockSentinel {
  release?: () => Promise<void> | void;
  addEventListener?: (type: string, cb: () => void) => void;
}

let sentinel: MinimalWakeLockSentinel | null = null;

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<MinimalWakeLockSentinel>;
  };
};

export function isWakeLockActive() {
  return !!sentinel;
}

export async function requestWakeLock(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as NavigatorWithWakeLock;
  if (!nav.wakeLock?.request) return false;
  try {
    const s = await nav.wakeLock.request("screen");
    sentinel = s;
    // Some implementations expose an event; guard it
    s.addEventListener?.("release", () => {
      sentinel = null;
    });
    return true;
  } catch (e) {
    console.warn("Wake Lock request failed:", e);
    sentinel = null;
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  try {
    await sentinel?.release?.();
  } catch {
    // ignore
  } finally {
    sentinel = null;
  }
}
