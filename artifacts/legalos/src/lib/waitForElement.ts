// Waits for an element to actually exist in the DOM instead of guessing at a
// delay.
//
// Onboarding used to reveal itself on fixed timers — "the dashboard is
// probably painted by 600ms" — which is a race on two counts: heavy sections
// are lazy-loaded behind Suspense, and the machine running it might be much
// slower than the one the number was tuned on. Losing that race means the
// first coach mark lands on an empty screen.
//
// A MutationObserver fires the moment the target mounts, so on a fast machine
// this is quicker than the old timer *and* on a slow one it still waits.
// The timeout is a floor, not the mechanism: it resolves null so callers can
// decide whether to proceed anyway (the tour does — it can skip past targets
// that never appear) rather than hanging forever on a target that will never
// render for this user.
export function waitForElement(
  selector: string,
  timeoutMs = 6000,
  signal?: AbortSignal,
): Promise<Element | null> {
  const existing = document.querySelector(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(null);
      return;
    }

    let settled = false;
    const finish = (el: Element | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(el);
    };

    const onAbort = () => finish(null);
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) finish(el);
    });
    const timer = setTimeout(() => finish(null), timeoutMs);

    signal?.addEventListener("abort", onAbort, { once: true });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
