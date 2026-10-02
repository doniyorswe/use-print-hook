import { useContext } from 'react';
import { PrintInstanceContext } from '../context/print-context';
import type { ExporterMap, UsePrintReturn } from '../types';

/** Shared instance created by the nearest `<PrintProvider>` (like react-hook-form's `useFormContext`). */
export function usePrintContext<E extends ExporterMap = ExporterMap>(): UsePrintReturn<E> {
  const ctx = useContext(PrintInstanceContext);
  if (!ctx) throw new Error('use-print-hook: usePrintContext must be used inside <PrintProvider>');
  return ctx as unknown as UsePrintReturn<E>;
}
