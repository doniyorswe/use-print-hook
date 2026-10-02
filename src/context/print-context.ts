import { createContext } from 'react';
import type { ExporterMap, PrintProviderConfig, UsePrintReturn } from '../types';

export interface PrintConfigContextValue {
  getConfig: () => PrintProviderConfig | undefined;
}

export const PrintConfigContext = createContext<PrintConfigContextValue | null>(null);

export const PrintInstanceContext = createContext<UsePrintReturn<ExporterMap> | null>(null);
