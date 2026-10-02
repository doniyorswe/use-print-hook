import { createContext, useContext } from 'react';

export const PrintModeContext = createContext(false);

/**
 * `true` while rendering for print: inside unmounted `content`, or inside a
 * `<Printable>` that is being printed. Use it to drop pagination, expand rows, etc.
 */
export function usePrintMode(): boolean {
  return useContext(PrintModeContext);
}
