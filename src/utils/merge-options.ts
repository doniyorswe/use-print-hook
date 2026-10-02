import { DEFAULT_IGNORE_SELECTOR, DEFAULT_TIMEOUT_MS } from '../constants';
import type {
  PageMargin,
  PageOptions,
  PrintConfig,
  PrintProviderConfig,
  WaitForOptions,
} from '../types';

type Required2<T> = { [K in keyof T]-?: T[K] };

export interface ResolvedConfig extends Omit<
  PrintConfig,
  'copyStyles' | 'ignoreSelector' | 'waitFor' | 'strategy' | 'page' | 'extraCss'
> {
  copyStyles: boolean;
  ignoreSelector: string;
  waitFor: Required2<WaitForOptions>;
  strategy: NonNullable<PrintConfig['strategy']>;
  page: PageOptions;
  extraCss: string;
}

function definedOnly<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

function mergeMargin(a: PageOptions['margin'], b: PageOptions['margin']): PageOptions['margin'] {
  if (b === undefined) return a;
  if (typeof a === 'object' && typeof b === 'object')
    return { ...a, ...definedOnly<PageMargin>(b) };
  return b;
}

/**
 * Merges config layers left → right (provider → hook → call).
 * Scalars and callbacks are replaced, `page`/`waitFor` are deep-merged,
 * `extraCss` is concatenated. `undefined` never overrides.
 */
export function mergeConfig(...layers: (PrintConfig | undefined)[]): ResolvedConfig {
  let page: PageOptions = {};
  let waitFor: WaitForOptions = {};
  const css: string[] = [];
  let rest: PrintConfig = {};

  for (const layer of layers) {
    if (!layer) continue;
    const { page: p, waitFor: w, extraCss, ...others } = layer;
    if (p) page = { ...page, ...definedOnly(p), margin: mergeMargin(page.margin, p.margin) };
    if (w) waitFor = { ...waitFor, ...definedOnly(w) };
    if (extraCss) css.push(extraCss);
    rest = { ...rest, ...definedOnly(others) };
  }
  if (page.margin === undefined) delete page.margin;

  return {
    ...rest,
    copyStyles: rest.copyStyles ?? true,
    ignoreSelector: rest.ignoreSelector ?? DEFAULT_IGNORE_SELECTOR,
    strategy: rest.strategy ?? 'auto',
    page,
    extraCss: css.join('\n'),
    waitFor: {
      images: waitFor.images ?? true,
      fonts: waitFor.fonts ?? true,
      stylesheets: waitFor.stylesheets ?? true,
      timeoutMs: waitFor.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    },
  };
}

export function resolveTitle(config: Pick<PrintConfig, 'documentTitle'>, fallback: string): string {
  const t =
    typeof config.documentTitle === 'function' ? config.documentTitle() : config.documentTitle;
  return t?.trim() || fallback;
}

/** Merges nested `<PrintProvider>` configs; exporters are merged by name. */
export function mergeProviderConfig(
  parent: PrintProviderConfig | undefined,
  child: PrintProviderConfig | undefined,
): PrintProviderConfig | undefined {
  if (!parent || !child) return parent ?? child;
  const { exporters: parentExporters, ...parentConfig } = parent;
  const { exporters: childExporters, ...childConfig } = child;
  return {
    ...mergeConfig(parentConfig, childConfig),
    exporters: { ...parentExporters, ...childExporters },
  };
}
