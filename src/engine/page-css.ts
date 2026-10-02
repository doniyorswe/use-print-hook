import type { PageOptions, PageSize } from '../types';

function sizeValue(
  size: PageSize | undefined,
  orientation: PageOptions['orientation'],
): string | null {
  if (Array.isArray(size)) {
    const [w, h] = size as readonly [string, string];
    return orientation === 'landscape' ? `${h} ${w}` : `${w} ${h}`;
  }
  const parts = [size as string | undefined, orientation].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

/** Compiles page options into an `@page` rule; empty string when nothing is set. */
export function compilePageCss(page: PageOptions = {}): string {
  const decls: string[] = [];
  const size = sizeValue(page.size, page.orientation);
  if (size) decls.push(`size: ${size};`);

  const { margin } = page;
  if (typeof margin === 'string') decls.push(`margin: ${margin};`);
  else if (margin) {
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      if (margin[side]) decls.push(`margin-${side}: ${margin[side]};`);
    }
  }
  return decls.length ? `@page { ${decls.join(' ')} }` : '';
}
