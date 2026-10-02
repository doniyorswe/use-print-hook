import { useContext, type ReactNode } from 'react';
import { PrintInstanceContext } from '../context/print-context';
import type { ExportCallOptions, ExporterMap, PrintCallOptions, UsePrintReturn } from '../types';

export interface PrintTriggerRenderProps<E extends ExporterMap> {
  /** Prints with the trigger's options; extra options are merged on top. */
  print: UsePrintReturn<E>['print'];
  exportAs: UsePrintReturn<E>['exportAs'];
  isPrinting: boolean;
  isExporting: boolean;
  error: Error | null;
}

export interface PrintTriggerProps<E extends ExporterMap> extends PrintCallOptions {
  /** Instance from `usePrint()`. Defaults to the nearest `<PrintProvider>`. */
  control?: UsePrintReturn<E>;
  render: (props: PrintTriggerRenderProps<E>) => ReactNode;
}

/**
 * Render-prop trigger, like react-hook-form's `Controller`.
 *
 * @example
 * <PrintTrigger target="invoice" render={({ print, isPrinting }) => (
 *   <Button onClick={() => print()} loading={isPrinting}>Print</Button>
 * )} />
 */
export function PrintTrigger<E extends ExporterMap = ExporterMap>({
  control,
  render,
  ...callOptions
}: PrintTriggerProps<E>) {
  const fromContext = useContext(PrintInstanceContext) as UsePrintReturn<E> | null;
  const instance = control ?? fromContext;
  if (!instance) {
    throw new Error('use-print-hook: <PrintTrigger> needs a `control` prop or a <PrintProvider>');
  }

  const print: UsePrintReturn<E>['print'] = (opts) => instance.print({ ...callOptions, ...opts });
  const exportAs = ((format: string, opts?: ExportCallOptions<unknown>) =>
    (instance.exportAs as (f: string, o?: ExportCallOptions<unknown>) => Promise<void>)(format, {
      ...callOptions,
      ...opts,
    })) as UsePrintReturn<E>['exportAs'];

  return (
    <>
      {render({
        print,
        exportAs,
        isPrinting: instance.isPrinting,
        isExporting: instance.isExporting,
        error: instance.error,
      })}
    </>
  );
}
