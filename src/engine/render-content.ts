import { createElement, type ComponentType, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { PrintModeContext } from '../context/print-mode';

/**
 * Renders `node` synchronously into `container` (inside the print document) with print mode on.
 * Returns an unmount function. Suspended subtrees are not awaited.
 */
export function renderContent(
  container: HTMLElement,
  node: ReactNode,
  wrapper?: ComponentType<{ children: ReactNode }>,
): () => void {
  const root = createRoot(container);
  const inner = wrapper ? createElement(wrapper, null, node) : node;
  flushSync(() => {
    root.render(createElement(PrintModeContext.Provider, { value: true }, inner));
  });
  return () => root.unmount();
}
