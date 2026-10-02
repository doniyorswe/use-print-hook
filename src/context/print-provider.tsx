import { useContext, useInsertionEffect, useRef, useState, type ReactNode } from 'react';
import { usePrintCore } from '../hooks/use-print';
import type { ExporterMap, PrintProviderConfig, UsePrintReturn } from '../types';
import { mergeProviderConfig } from '../utils/merge-options';
import {
  PrintConfigContext,
  PrintInstanceContext,
  type PrintConfigContextValue,
} from './print-context';

export interface PrintProviderProps {
  /** Defaults for every `usePrint` below; nested providers merge. */
  config?: PrintProviderConfig;
  children?: ReactNode;
}

/**
 * Supplies default config (page, css, exporters, `wrapper`) and a shared instance for
 * `usePrintContext` / `<PrintTrigger>`. Config is read at call time, so changing it never re-renders consumers.
 */
export function PrintProvider({ config, children }: PrintProviderProps) {
  const parent = useContext(PrintConfigContext);
  const configRef = useRef(config);
  const parentRef = useRef(parent);
  useInsertionEffect(() => {
    configRef.current = config;
    parentRef.current = parent;
  });

  const [value] = useState<PrintConfigContextValue>(() => ({
    getConfig: () => mergeProviderConfig(parentRef.current?.getConfig(), configRef.current),
  }));
  const instance = usePrintCore<ExporterMap>(undefined, value.getConfig);

  return (
    <PrintConfigContext.Provider value={value}>
      <PrintInstanceContext.Provider value={instance as UsePrintReturn<ExporterMap>}>
        {children}
      </PrintInstanceContext.Provider>
    </PrintConfigContext.Provider>
  );
}
