import type { ReactNode } from 'react';
import { NO_PRINT_CLASS, PAGE_BREAK_CLASS, PRINT_ONLY_CLASS } from '../constants';
import { nextFrame, throwIfAborted } from '../utils/env';
import type { ResolvedConfig } from '../utils/merge-options';
import { cloneWithState } from './clone';
import type { PrintHost } from './host';
import { compilePageCss } from './page-css';
import { renderContent } from './render-content';
import { appendStyle, copyRootAttributes, copyStyles } from './styles';
import { waitForAssets } from './wait';

export type PrintSource =
  { kind: 'element'; element: HTMLElement } | { kind: 'content'; node: ReactNode };

export interface PreparedDocument {
  host: PrintHost;
  /** Root of the output inside `host.document`. */
  root: HTMLElement;
  dispose(): void;
}

export function baseCss(ignoreSelector: string): string {
  const hidden = Array.from(new Set([`.${NO_PRINT_CLASS}`, ignoreSelector])).join(', ');
  return [
    `${hidden} { display: none !important; }`,
    `.${PAGE_BREAK_CLASS} { break-after: page; page-break-after: always; }`,
    'html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    'body { margin: 0; }',
  ].join('\n');
}

/**
 * Builds the print document inside `host`: snapshot/render the content, copy styles,
 * inject page + base CSS, then wait for assets. `onSnapshot` fires as soon as the DOM
 * is captured so callers can restore on-screen state early.
 */
export async function prepareDocument(
  host: PrintHost,
  source: PrintSource,
  config: ResolvedConfig,
  title: string,
  signal: AbortSignal,
  onSnapshot?: () => void,
): Promise<PreparedDocument> {
  const owner = (source.kind === 'element' ? source.element.ownerDocument : null) ?? document;
  const doc = host.document;
  let unmount: (() => void) | null = null;
  let disposed = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    setTimeout(() => {
      unmount?.();
      host.dispose();
    }, 0);
  };

  try {
    doc.title = title;
    copyRootAttributes(owner, doc);

    let root: HTMLElement;
    let original: HTMLElement | null = null;
    if (source.kind === 'element') {
      original = source.element;
      root = doc.adoptNode(cloneWithState(source.element));
      doc.body.appendChild(root);
      root.querySelectorAll<HTMLElement>(`.${PRINT_ONLY_CLASS}`).forEach((el) => {
        el.style.removeProperty('display');
      });
    } else {
      root = doc.createElement('div');
      root.setAttribute('data-uph-root', '');
      doc.body.appendChild(root);
      unmount = renderContent(root, source.node, config.wrapper);
    }
    onSnapshot?.();

    config.transformClone?.(root, original);

    const links = config.copyStyles ? copyStyles(owner, doc) : [];
    appendStyle(doc, baseCss(config.ignoreSelector), 'base');
    appendStyle(doc, compilePageCss(config.page), 'page');
    appendStyle(doc, config.extraCss, 'extra');

    await waitForAssets(config.waitFor, { root, links, docs: [doc, owner] });
    throwIfAborted(signal);
    await nextFrame(host.window);
    throwIfAborted(signal);

    return { host, root, dispose };
  } catch (err) {
    dispose();
    throw err;
  }
}
