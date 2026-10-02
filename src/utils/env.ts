export const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof document !== 'undefined';

/** iOS/iPadOS WebKit prints the parent page instead of the iframe in several versions. */
export function isIOS(): boolean {
  if (!isBrowser()) return false;
  const { userAgent, platform, maxTouchPoints } = navigator;
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export const nextFrame = (win: Window = window): Promise<void> =>
  new Promise((resolve) => {
    if (typeof win.requestAnimationFrame === 'function') win.requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 16);
  });

export function abortError(): Error {
  const err = new Error('Print aborted');
  err.name = 'AbortError';
  return err;
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
