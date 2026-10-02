import type { Exporter } from '../types';
import { throwIfAborted } from '../utils/env';
import type { ResolvedConfig } from '../utils/merge-options';
import { createIframeHost, type PrintHost } from './host';
import { prepareDocument, type PreparedDocument, type PrintSource } from './prepare';
import { printWindow } from './print-window';

/** Hook used by `<Printable>` to re-render its subtree in print mode before the snapshot. */
export interface PrintModeController {
  setPrintMode(on: boolean): Promise<void>;
}

export interface JobInput {
  kind: 'print' | 'export';
  config: ResolvedConfig;
  title: string;
  /** Called after print mode is on, so it sees the print-mode DOM. */
  resolveSource: () => PrintSource;
  printMode?: PrintModeController | null;
  exporter?: Exporter<unknown>;
  exporterOptions?: unknown;
  /** Pre-opened popup (window strategy). */
  host?: PrintHost | null;
  signal: AbortSignal;
}

/** Element width, else A4 width at 96dpi (portrait/landscape). */
function hostWidth(source: PrintSource, config: ResolvedConfig): number {
  const w = source.kind === 'element' ? source.element.getBoundingClientRect().width : 0;
  return w > 0 ? w : config.page.orientation === 'landscape' ? 1123 : 794;
}

/**
 * One print/export run: `onBeforePrint` → print mode on → snapshot → print mode off →
 * wait for assets → print dialog or exporter → `onAfterPrint`. Always disposes the host.
 */
export async function runJob(input: JobInput): Promise<void> {
  const { config, signal } = input;
  let host = input.host ?? null;
  let prepared: PreparedDocument | null = null;
  let printModeOn = false;

  const exitPrintMode = () => {
    if (!printModeOn) return;
    printModeOn = false;
    void input.printMode?.setPrintMode(false);
  };

  try {
    await config.onBeforePrint?.();
    throwIfAborted(signal);

    if (input.printMode) {
      printModeOn = true;
      await input.printMode.setPrintMode(true);
      throwIfAborted(signal);
    }

    const source = input.resolveSource();
    host ??= createIframeHost(document, hostWidth(source, config));
    prepared = await prepareDocument(host, source, config, input.title, signal, exitPrintMode);

    if (input.kind === 'print') {
      await printWindow(prepared.host.window, window);
    } else {
      if (!input.exporter) throw new Error('use-print-hook: missing exporter');
      await input.exporter.export(prepared.root, {
        options: (input.exporterOptions ?? {}) as Partial<unknown>,
        filename: input.title,
        page: config.page,
        document: prepared.host.document,
        window: prepared.host.window,
        signal,
      });
    }
    throwIfAborted(signal);
    config.onAfterPrint?.();
  } finally {
    exitPrintMode();
    if (prepared) prepared.dispose();
    else host?.dispose();
  }
}
