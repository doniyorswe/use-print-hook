import type { ComponentType, ReactNode } from 'react';

/** Anything that resolves to the element to print: a ref object or a getter. */
export type ElementSource = { readonly current: HTMLElement | null } | (() => HTMLElement | null);

/** Named CSS page size, any valid `size` keyword, or an explicit `[width, height]` (e.g. `['80mm', '200mm']`). */
export type PageSize =
  | 'A3'
  | 'A4'
  | 'A5'
  | 'B4'
  | 'B5'
  | 'Letter'
  | 'Legal'
  | 'Ledger'
  | (string & {})
  | readonly [width: string, height: string];

export interface PageMargin {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

/** Compiled to an `@page` rule. */
export interface PageOptions {
  size?: PageSize;
  orientation?: 'portrait' | 'landscape';
  /** CSS shorthand (`"10mm"`, `"10mm 15mm"`) or per side. */
  margin?: string | PageMargin;
}

export interface WaitForOptions {
  /** Wait for `<img>` inside the print root. Default `true`. */
  images?: boolean;
  /** Wait for `document.fonts.ready`. Default `true`. */
  fonts?: boolean;
  /** Wait for copied `<link rel="stylesheet">`. Default `true`. */
  stylesheets?: boolean;
  /** Upper bound for all waits; printing continues when it elapses. Default `5000`. */
  timeoutMs?: number;
}

/**
 * - `auto`: hidden iframe, or a new window where iframe printing is known to be unreliable (iOS).
 * - `iframe` / `window`: force one.
 */
export type PrintStrategy = 'auto' | 'iframe' | 'window';

/** Options shared by the provider, the hook and each call. Later layers win. */
export interface PrintConfig {
  /** Print dialog title and default export filename. Default: `document.title`. */
  documentTitle?: string | (() => string);
  page?: PageOptions;
  /** Copy the page's stylesheets into the print document. Default `true`. */
  copyStyles?: boolean;
  /** Extra CSS for the print document. Concatenated across layers, not replaced. */
  extraCss?: string;
  /** Elements matching this are hidden in the output. Default `".uph-no-print"`. */
  ignoreSelector?: string;
  waitFor?: WaitForOptions;
  strategy?: PrintStrategy;
  /** Wraps unmounted `content` (theme, i18n, QueryClient providers…). */
  wrapper?: ComponentType<{ children: ReactNode }>;
  onBeforePrint?: () => void | Promise<void>;
  onAfterPrint?: () => void;
  onError?: (error: Error) => void;
  /**
   * Last chance to mutate the output DOM before printing/exporting.
   * `original` is `null` when printing unmounted `content`.
   */
  transformClone?: (clone: HTMLElement, original: HTMLElement | null) => void;
}

export interface ExportContext<O> {
  /** Call-time options from `exportAs(format, { exporter })`; exporters merge their own defaults. */
  options: Partial<O>;
  /** Resolved `documentTitle`, without extension. */
  filename: string;
  page: PageOptions;
  /** Document that owns `element` (the hidden print document, not the app). */
  document: Document;
  window: Window;
  /** Aborted when the owning component unmounts. */
  signal: AbortSignal;
}

/**
 * Pluggable output format. Receives the fully prepared element
 * (styles copied, `ignoreSelector` applied, `transformClone` run).
 *
 * @example
 * const htmlExporter: Exporter<{ pretty?: boolean }> = {
 *   name: 'html',
 *   async export(element, { filename }) {
 *     const blob = new Blob([element.outerHTML], { type: 'text/html' });
 *     downloadBlob(blob, `${filename}.html`);
 *   },
 * };
 */
export interface Exporter<O = undefined> {
  readonly name: string;
  export(element: HTMLElement, context: ExportContext<O>): Promise<void>;
}

/** Registry of exporters keyed by format name. */
export type ExporterMap = Record<string, Exporter<unknown>>;

/** No exporters registered on the hook. */
export type NoExporters = Record<never, never>;

/** Extracts an exporter's option type. */
export type ExporterOptions<X> = X extends Exporter<infer O> ? O : never;

/** Format names accepted by `exportAs`; any string when the hook has none (provider exporters). */
export type ExportFormat<E> = [keyof E] extends [never] ? string : keyof E & string;

type OptionsFor<E, K> = K extends keyof E ? ExporterOptions<E[K]> : unknown;

export interface PrintCallOptions extends PrintConfig {
  /** Id of a mounted `<Printable>`. */
  target?: string;
  /** React node rendered off-screen just for this print (no need to mount it). */
  content?: ReactNode;
  /** Overrides the hook's `contentRef` for this call. */
  contentRef?: ElementSource;
}

export interface ExportCallOptions<O> extends PrintCallOptions {
  /** Exporter-specific options, merged over the exporter's defaults. */
  exporter?: Partial<O>;
}

export interface UsePrintOptions<E extends ExporterMap = NoExporters> extends PrintConfig {
  contentRef?: ElementSource;
  exporters?: E;
}

/** Callback ref with a readable `current`; attach it to any element. */
export type PrintContentRef = ((node: HTMLElement | null) => void) & {
  readonly current: HTMLElement | null;
};

export interface UsePrintReturn<E extends ExporterMap = NoExporters> {
  /** Opens the print dialog. Never rejects; failures land in `error` / `onError`. */
  print: (options?: PrintCallOptions) => Promise<void>;
  /** Runs a registered exporter. Never rejects; failures land in `error` / `onError`. */
  exportAs: <K extends ExportFormat<E>>(
    format: K,
    options?: ExportCallOptions<OptionsFor<E, K>>,
  ) => Promise<void>;
  isPrinting: boolean;
  isExporting: boolean;
  error: Error | null;
  /** Attach to the element to print when you don't pass your own `contentRef`. */
  contentRef: PrintContentRef;
}

export interface PrintProviderConfig extends PrintConfig {
  exporters?: ExporterMap;
}
