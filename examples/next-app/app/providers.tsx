'use client';

import type { ReactNode } from 'react';
import { PrintProvider } from 'use-print-hook';
import { createImageExporter } from 'use-print-hook/image';
import { createPdfExporter } from 'use-print-hook/pdf';
import { CurrencyProvider } from './currency';

const exporters = {
  pdf: createPdfExporter({ marginMm: 12 }),
  png: createImageExporter(),
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CurrencyProvider>
      <PrintProvider
        config={{
          page: { size: 'A4', margin: '12mm' },
          exporters,
          wrapper: CurrencyProvider,
          extraCss: 'body { font-size: 12pt; }',
        }}
      >
        {children}
      </PrintProvider>
    </CurrencyProvider>
  );
}
