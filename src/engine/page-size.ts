import type { PageOptions } from '../types';

const PX_PER: Record<string, number> = { px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, pt: 96 / 72 };

/** Portrait page dimensions in mm for named sizes. */
export const PAGE_SIZES_MM: Record<string, readonly [number, number]> = {
  a3: [297, 420],
  a4: [210, 297],
  a5: [148, 210],
  b4: [250, 353],
  b5: [176, 250],
  letter: [215.9, 279.4],
  legal: [215.9, 355.6],
  ledger: [279.4, 431.8],
};

export function lengthToMm(value: string): number | null {
  const m = /^\s*([\d.]+)\s*(px|in|cm|mm|pt)?\s*$/.exec(value);
  if (!m?.[1]) return null;
  const px = Number(m[1]) * (PX_PER[m[2] ?? 'px'] ?? 1);
  return (px * 25.4) / 96;
}

/** Page dimensions in mm (orientation applied), or `null` when unknown. */
export function pageSizeMm(page: PageOptions = {}): [number, number] | null {
  let dims: [number, number] | null = null;
  if (Array.isArray(page.size)) {
    const [w, h] = page.size as readonly [string, string];
    const wm = lengthToMm(w);
    const hm = lengthToMm(h);
    if (wm !== null && hm !== null) dims = [wm, hm];
  } else {
    const named = PAGE_SIZES_MM[String(page.size ?? 'A4').toLowerCase()];
    if (named) dims = [named[0], named[1]];
  }
  if (!dims) return null;
  return page.orientation === 'landscape' ? [dims[1], dims[0]] : dims;
}
