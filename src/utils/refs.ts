import type { Ref } from 'react';
import type { ElementSource, PrintContentRef } from '../types';

export function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

export function resolveElement(source: ElementSource | undefined): HTMLElement | null {
  if (!source) return null;
  if ('current' in source) return source.current;
  return source();
}

/** Stable callback ref that also exposes `current`. */
export function createContentRef(): PrintContentRef {
  let current: HTMLElement | null = null;
  const ref = (node: HTMLElement | null) => {
    current = node;
  };
  Object.defineProperty(ref, 'current', { get: () => current, enumerable: true });
  return ref as PrintContentRef;
}

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}
