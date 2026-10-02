const DELAYED_FOCUS_MS = 500;

/**
 * Calls `win.print()` and resolves once the dialog is gone.
 * Chrome/Firefox block inside `print()` and fire `afterprint`. Safari returns early and fires it
 * unreliably, so the `print` media query, focus returning to the opener and a hard cap are fallbacks.
 */
export function printWindow(win: Window, opener: Window, maxWaitMs = 5 * 60_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanups: (() => void)[] = [];
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      cleanups.forEach((fn) => fn());
      resolve();
    };
    const listen = (target: EventTarget, type: string) => {
      target.addEventListener(type, done);
      cleanups.push(() => target.removeEventListener(type, done));
    };

    listen(win, 'afterprint');
    if (opener !== win) listen(opener, 'afterprint');

    const mql = typeof win.matchMedia === 'function' ? win.matchMedia('print') : null;
    if (mql) {
      const onChange = (e: MediaQueryListEvent) => {
        if (!e.matches) done();
      };
      mql.addEventListener?.('change', onChange);
      cleanups.push(() => mql.removeEventListener?.('change', onChange));
    }

    const focusTimer = setTimeout(() => listen(opener, 'focus'), DELAYED_FOCUS_MS);
    const capTimer = setTimeout(done, maxWaitMs);
    cleanups.push(
      () => clearTimeout(focusTimer),
      () => clearTimeout(capTimer),
    );

    try {
      win.focus();
      win.print();
    } catch (err) {
      finished = true;
      cleanups.forEach((fn) => fn());
      reject(err);
    }
  });
}
