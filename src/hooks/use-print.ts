import {
  useCallback,
  useContext,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PrintConfigContext } from '../context/print-context';
import { getPrintable } from '../context/registry';
import { openWindowHost, type PrintHost } from '../engine/host';
import { runJob } from '../engine/job';
import type { PrintSource } from '../engine/prepare';
import type {
  ExportCallOptions,
  Exporter,
  ExporterMap,
  NoExporters,
  PrintCallOptions,
  PrintProviderConfig,
  PrintStrategy,
  UsePrintOptions,
  UsePrintReturn,
} from '../types';
import { isIOS, toError } from '../utils/env';
import { mergeConfig, resolveTitle } from '../utils/merge-options';
import { createContentRef, resolveElement } from '../utils/refs';

interface PrintState {
  isPrinting: boolean;
  isExporting: boolean;
  error: Error | null;
}

const IDLE: PrintState = { isPrinting: false, isExporting: false, error: null };

/** One job at a time app-wide: two print dialogs can't coexist, and it absorbs double clicks. */
let activeJob: Promise<void> | null = null;

function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useInsertionEffect(() => {
    ref.current = value;
  });
  return ref;
}

function prefersWindow(strategy: PrintStrategy): boolean {
  return strategy === 'window' || (strategy === 'auto' && isIOS());
}

/**
 * Hook implementation shared by `usePrint` and `<PrintProvider>`.
 * Merge order: provider config → hook options → call options.
 * @internal
 */
export function usePrintCore<E extends ExporterMap>(
  options: UsePrintOptions<E> | undefined,
  getProviderConfig: (() => PrintProviderConfig | undefined) | undefined,
): UsePrintReturn<E> {
  const optionsRef = useLatest(options);
  const providerRef = useLatest(getProviderConfig);
  const [contentRef] = useState(createContentRef);
  const [state, setState] = useState<PrintState>(IDLE);
  const mountedRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const run = useCallback(
    (kind: 'print' | 'export', call: ExportCallOptions<unknown> = {}, format?: string) => {
      if (activeJob) return activeJob;

      const {
        contentRef: hookRef,
        exporters: hookExporters,
        ...hookConfig
      } = optionsRef.current ?? {};
      const { exporters: providerExporters, ...providerConfig } = providerRef.current?.() ?? {};
      const {
        target,
        content,
        contentRef: callRef,
        exporter: exporterOptions,
        ...callConfig
      } = call;
      const config = mergeConfig(providerConfig, hookConfig, callConfig);

      const setIfMounted = (next: PrintState) => {
        if (mountedRef.current) setState(next);
      };
      const fail = (err: unknown) => {
        const error = toError(err);
        if (error.name === 'AbortError') return setIfMounted(IDLE);
        config.onError?.(error);
        setIfMounted({ ...IDLE, error });
      };

      let exporter: Exporter<unknown> | undefined;
      if (kind === 'export') {
        exporter = format ? { ...providerExporters, ...hookExporters }[format] : undefined;
        if (!exporter) {
          fail(new Error(`use-print-hook: no exporter registered for "${String(format)}"`));
          return Promise.resolve();
        }
      }

      const printable = content === undefined && target ? getPrintable(target) : undefined;
      if (content === undefined && target && !printable) {
        fail(new Error(`use-print-hook: no <Printable id="${target}"> is mounted`));
        return Promise.resolve();
      }

      const resolveSource = (): PrintSource => {
        if (content !== undefined) return { kind: 'content', node: content };
        const element = printable
          ? printable.getElement()
          : resolveElement(callRef ?? hookRef ?? contentRef);
        if (!element) {
          throw new Error(
            'use-print-hook: nothing to print. Pass `contentRef`, `target` or `content`, or attach the returned `contentRef`.',
          );
        }
        return { kind: 'element', element };
      };

      let host: PrintHost | null = null;
      if (kind === 'print' && prefersWindow(config.strategy)) host = openWindowHost(window);

      const controller = new AbortController();
      controllerRef.current = controller;
      setState({ isPrinting: kind === 'print', isExporting: kind === 'export', error: null });

      const job = runJob({
        kind,
        config,
        title: resolveTitle(config, document.title || 'document'),
        resolveSource,
        printMode: printable ?? null,
        exporter,
        exporterOptions,
        host,
        signal: controller.signal,
      })
        .then(() => setIfMounted(IDLE), fail)
        .finally(() => {
          if (activeJob === job) activeJob = null;
          if (controllerRef.current === controller) controllerRef.current = null;
        });
      activeJob = job;
      return job;
    },
    [contentRef, optionsRef, providerRef],
  );

  const print = useCallback((opts?: PrintCallOptions) => run('print', opts), [run]);
  const exportAs = useCallback(
    (format: string, opts?: ExportCallOptions<unknown>) => run('export', opts, format),
    [run],
  ) as UsePrintReturn<E>['exportAs'];

  return useMemo(
    () => ({ print, exportAs, contentRef, ...state }),
    [print, exportAs, contentRef, state],
  );
}

/**
 * Headless print/export controller.
 *
 * @example
 * const { contentRef, print, isPrinting } = usePrint({ documentTitle: 'Invoice' });
 * return (
 *   <>
 *     <div ref={contentRef}>…</div>
 *     <button onClick={() => print()} disabled={isPrinting}>Print</button>
 *   </>
 * );
 */
export function usePrint<E extends ExporterMap = NoExporters>(
  options?: UsePrintOptions<E>,
): UsePrintReturn<E> {
  const ctx = useContext(PrintConfigContext);
  return usePrintCore(options, ctx?.getConfig);
}
