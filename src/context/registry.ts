import type { PrintModeController } from '../engine/job';

export interface PrintableEntry extends PrintModeController {
  getElement(): HTMLElement | null;
}

const registry = new Map<string, PrintableEntry>();

/** Registers a `<Printable>` under `id`; returns the unregister function. */
export function registerPrintable(id: string, entry: PrintableEntry): () => void {
  registry.set(id, entry);
  return () => {
    if (registry.get(id) === entry) registry.delete(id);
  };
}

export function getPrintable(id: string): PrintableEntry | undefined {
  return registry.get(id);
}
