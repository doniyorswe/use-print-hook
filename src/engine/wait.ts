import type { WaitForOptions } from '../types';

const settle = (target: EventTarget): Promise<void> =>
  new Promise((resolve) => {
    const done = () => {
      target.removeEventListener('load', done);
      target.removeEventListener('error', done);
      resolve();
    };
    target.addEventListener('load', done);
    target.addEventListener('error', done);
  });

export function waitForImages(root: ParentNode): Promise<void>[] {
  return Array.from(root.querySelectorAll('img'))
    .filter((img) => !img.complete && img.getAttribute('src'))
    .map((img) => settle(img));
}

export function waitForStylesheets(links: HTMLLinkElement[]): Promise<void>[] {
  return links.filter((link) => !link.sheet).map((link) => settle(link));
}

export function waitForFonts(...docs: Document[]): Promise<void>[] {
  return docs
    .map((doc) => doc.fonts?.ready)
    .filter((ready): ready is Promise<FontFaceSet> => !!ready)
    .map((ready) => ready.then(() => undefined));
}

/**
 * Waits for images and stylesheets, then fonts (font loads only start once styles apply).
 * Resolves on completion or after `timeoutMs`; never rejects.
 */
export function waitForAssets(
  opts: Required<WaitForOptions>,
  ctx: { root: ParentNode; links: HTMLLinkElement[]; docs: Document[] },
): Promise<void> {
  if (!opts.images && !opts.stylesheets && !opts.fonts) return Promise.resolve();

  const run = async () => {
    await Promise.allSettled([
      ...(opts.images ? waitForImages(ctx.root) : []),
      ...(opts.stylesheets ? waitForStylesheets(ctx.links) : []),
    ]);
    if (opts.fonts) await Promise.allSettled(waitForFonts(...ctx.docs));
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, opts.timeoutMs);
  });
  return Promise.race([run(), timeout]).finally(() => clearTimeout(timer));
}
