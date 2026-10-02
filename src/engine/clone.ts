/**
 * Deep-clones `source` and restores state `cloneNode` drops: canvas pixels,
 * live form values, lazy images. Original and clone are walked in parallel
 * (same shape), so node swaps are deferred until after the walk.
 */
export function cloneWithState(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  const originals = [source, ...Array.from(source.querySelectorAll('*'))];
  const copies = [clone, ...Array.from(clone.querySelectorAll('*'))];

  const replacements: [Element, Element][] = [];
  for (let i = 0; i < originals.length; i++) {
    const original = originals[i];
    const copy = copies[i];
    if (!original || !copy) continue;
    const replacement = syncElement(original, copy);
    if (replacement) replacements.push([copy, replacement]);
  }
  for (const [copy, replacement] of replacements) copy.replaceWith(replacement);

  return clone;
}

function syncElement(original: Element, copy: Element): Element | null {
  const tag = original.tagName;

  if (tag === 'CANVAS') return canvasToImage(original as HTMLCanvasElement, copy);

  if (tag === 'INPUT') {
    const input = original as HTMLInputElement;
    if (input.type === 'checkbox' || input.type === 'radio') {
      toggleAttr(copy, 'checked', input.checked);
    } else if (input.type !== 'file' && input.type !== 'password') {
      copy.setAttribute('value', input.value);
    }
  } else if (tag === 'TEXTAREA') {
    copy.textContent = (original as HTMLTextAreaElement).value;
  } else if (tag === 'SELECT') {
    const options = (original as HTMLSelectElement).options;
    const copyOptions = (copy as HTMLSelectElement).options;
    for (let i = 0; i < options.length; i++) {
      const target = copyOptions[i];
      if (target) toggleAttr(target, 'selected', options[i]?.selected ?? false);
    }
  } else if (tag === 'IMG' && copy.getAttribute('loading') === 'lazy') {
    copy.setAttribute('loading', 'eager');
  }
  return null;
}

function toggleAttr(el: Element, name: string, on: boolean): void {
  if (on) el.setAttribute(name, '');
  else el.removeAttribute(name);
}

/**
 * Canvas → `<img>` snapshot. Returns `null` for tainted or empty canvases.
 * CSS size comes from the on-screen box, since `width`/`height` attributes are backing-store pixels.
 */
function canvasToImage(canvas: HTMLCanvasElement, copy: Element): Element | null {
  let src: string;
  try {
    src = canvas.toDataURL('image/png');
  } catch {
    return null;
  }
  if (!src || src === 'data:,') return null;

  const img = copy.ownerDocument.createElement('img');
  for (const attr of Array.from(copy.attributes)) {
    if (attr.name !== 'width' && attr.name !== 'height') img.setAttribute(attr.name, attr.value);
  }
  img.src = src;
  const rect = canvas.getBoundingClientRect();
  if (!canvas.style.width && rect.width) img.style.width = `${rect.width}px`;
  if (!canvas.style.height && rect.height) img.style.height = `${rect.height}px`;
  return img;
}
