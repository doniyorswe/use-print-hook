'use client';

import { useState } from 'react';
import { NoPrint, PrintTrigger, Printable, usePrintMode } from 'use-print-hook';
import { buttonClass, Card } from './card';

const orders = Array.from({ length: 48 }, (_, i) => ({
  id: 1000 + i,
  product: ['Cotton', 'Wheat', 'Copper', 'Gold'][i % 4],
  volume: ((i * 37) % 90) + 10,
}));

const PAGE_SIZE = 8;

function OrdersTable() {
  const printMode = usePrintMode();
  const [page, setPage] = useState(0);
  const rows = printMode ? orders : orders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pages = Math.ceil(orders.length / PAGE_SIZE);

  return (
    <>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">#</th>
            <th>Product</th>
            <th className="text-right">Volume, t</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-b odd:bg-slate-50">
              <td className="py-1.5">{o.id}</td>
              <td>{o.product}</td>
              <td className="text-right">{o.volume}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <NoPrint className="mt-3 flex items-center gap-2 text-sm">
        <button
          className="rounded border px-2"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          ‹
        </button>
        Page {page + 1} / {pages}
        <button
          className="rounded border px-2"
          disabled={page === pages - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          ›
        </button>
      </NoPrint>
    </>
  );
}

export function OrdersDemo() {
  return (
    <Card
      title="3. usePrintMode"
      description="On screen the table is paginated. When the <Printable> is printed it re-renders with all 48 rows."
    >
      <Printable id="orders">
        <OrdersTable />
      </Printable>
      <PrintTrigger
        target="orders"
        documentTitle="Orders"
        render={({ print, exportAs, isPrinting, isExporting }) => (
          <div className="mt-4 flex gap-2">
            <button className={buttonClass} disabled={isPrinting} onClick={() => print()}>
              Print all rows
            </button>
            <button className={buttonClass} disabled={isExporting} onClick={() => exportAs('png')}>
              Save as PNG
            </button>
          </div>
        )}
      />
    </Card>
  );
}
