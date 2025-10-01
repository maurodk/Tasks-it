// Global refetch broadcaster. Emits a custom event on focus/visibility/pageshow
// and sends a small burst (0ms, +300ms, +1500ms) to survive wake/sleep races.

let initialized = false;
let cleanupFns: Array<() => void> = [];

export function initFocusRefetch() {
  if (typeof window === "undefined" || initialized) return () => {};
  initialized = true;

  const emit = () => {
    try {
      const evt = new Event("app:refetch");
      window.dispatchEvent(evt);
      // burst to cover token refresh / network wake-up
      setTimeout(() => window.dispatchEvent(new Event("app:refetch")), 300);
      setTimeout(() => window.dispatchEvent(new Event("app:refetch")), 1500);
    } catch {
      // no-op
    }
  };

  const onFocus = () => emit();
  const onPageShow = () => emit();
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") emit();
  };

  window.addEventListener("focus", onFocus);
  window.addEventListener("pageshow", onPageShow);
  document.addEventListener("visibilitychange", onVisibilityChange);

  cleanupFns.push(() => window.removeEventListener("focus", onFocus));
  cleanupFns.push(() => window.removeEventListener("pageshow", onPageShow));
  cleanupFns.push(() =>
    document.removeEventListener("visibilitychange", onVisibilityChange)
  );

  // Emit once on init to warm up listeners that mount late
  emit();

  return () => {
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
    initialized = false;
  };
}

export function triggerRefetchNow() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("app:refetch"));
  } catch {
    // ignore
  }
}
