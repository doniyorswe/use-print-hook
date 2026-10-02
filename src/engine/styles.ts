const COPIED_ATTRS = /^(class|style|lang|dir|data-.*)$/;

/**
 * Mirrors `class`, `style`, `lang`, `dir` and `data-*` from `<html>`/`<body>`.
 * Required for `next/font` (CSS variables live on those classes), dark-mode classes and `data-theme`.
 */
export function copyRootAttributes(from: Document, to: Document): void {
  const pairs: [Element, Element][] = [
    [from.documentElement, to.documentElement],
    [from.body, to.body],
  ];
  for (const [src, dst] of pairs) {
    for (const attr of Array.from(src.attributes)) {
      if (COPIED_ATTRS.test(attr.name)) dst.setAttribute(attr.name, attr.value);
    }
  }
}

function sheetText(sheet: CSSStyleSheet): string | null {
  try {
    return Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n');
  } catch {
    return null;
  }
}

/**
 * Copies every stylesheet of `from` into `to`'s head, in document order.
 * `<style>` content is read from the CSSOM, which catches rules injected via
 * `insertRule` (emotion/Chakra/MUI speedy mode, styled-components) whose text is empty.
 * Also serializes `adoptedStyleSheets`.
 */
export function copyStyles(from: Document, to: Document): HTMLLinkElement[] {
  const links: HTMLLinkElement[] = [];
  const nodes = from.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
    'link[rel~="stylesheet"], style',
  );

  for (const node of Array.from(nodes)) {
    if (node.tagName === 'LINK') {
      const link = node as HTMLLinkElement;
      if (link.disabled || !link.href) continue;
      const copy = to.createElement('link');
      copy.rel = 'stylesheet';
      copy.href = link.href;
      if (link.media) copy.media = link.media;
      if (link.crossOrigin !== null) copy.crossOrigin = link.crossOrigin;
      to.head.appendChild(copy);
      links.push(copy);
      continue;
    }
    const style = node as HTMLStyleElement;
    const fromCssom = style.sheet ? sheetText(style.sheet) : null;
    const text = fromCssom || style.textContent || '';
    if (!text) continue;
    const copy = to.createElement('style');
    if (style.media) copy.media = style.media;
    copy.textContent = text;
    to.head.appendChild(copy);
  }

  const adopted = (from as Document & { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets;
  if (adopted?.length) {
    const copy = to.createElement('style');
    copy.textContent = adopted.map((s) => sheetText(s) ?? '').join('\n');
    to.head.appendChild(copy);
  }
  return links;
}

export function appendStyle(doc: Document, css: string, id?: string): HTMLStyleElement | null {
  if (!css) return null;
  const style = doc.createElement('style');
  if (id) style.setAttribute('data-uph', id);
  style.textContent = css;
  doc.head.appendChild(style);
  return style;
}
