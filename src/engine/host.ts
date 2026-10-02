/** Document that receives the print output: a hidden iframe or a popup window. */
export interface PrintHost {
  readonly kind: 'iframe' | 'window';
  readonly window: Window;
  readonly document: Document;
  dispose(): void;
}

function writeShell(doc: Document, baseHref: string): void {
  doc.open();
  doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>');
  doc.close();
  const base = doc.createElement('base');
  base.href = baseHref;
  doc.head.prepend(base);
}

export function createIframeHost(owner: Document, widthPx: number): PrintHost {
  const iframe = owner.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('data-uph-frame', '');
  iframe.tabIndex = -1;
  iframe.title = 'print';
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${Math.max(1, Math.round(widthPx))}px`,
    height: '100vh',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  });
  owner.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    throw new Error('use-print-hook: could not access the print iframe document');
  }
  writeShell(doc, owner.baseURI);
  return { kind: 'iframe', window: win, document: doc, dispose: () => iframe.remove() };
}

/**
 * Opens an empty popup. Must run synchronously inside the user gesture,
 * otherwise popup blockers kick in. Returns `null` when blocked.
 */
export function openWindowHost(opener: Window): PrintHost | null {
  const win = opener.open('', '_blank');
  if (!win) return null;
  writeShell(win.document, opener.document.baseURI);
  return {
    kind: 'window',
    window: win,
    document: win.document,
    dispose: () => {
      if (!win.closed) win.close();
    },
  };
}
