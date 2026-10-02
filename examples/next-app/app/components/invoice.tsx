'use client';

import { PageBreak, usePrintContext } from 'use-print-hook';
import { useMoney } from '../currency';
import { buttonClass, Card } from './card';

interface InvoiceData {
  number: string;
  customer: string;
  items: { name: string; qty: number; price: number }[];
}

const invoice: InvoiceData = {
  number: 'INV-2026-001',
  customer: 'NextBrain LLC',
  items: [
    { name: 'Design', qty: 10, price: 450_000 },
    { name: 'Development', qty: 40, price: 600_000 },
    { name: 'Hosting', qty: 12, price: 120_000 },
  ],
};

function Invoice({ data }: { data: InvoiceData }) {
  const money = useMoney();
  const total = data.items.reduce((sum, i) => sum + i.qty * i.price, 0);
  return (
    <article className="p-2">
      <h1 className="text-2xl font-bold">Invoice {data.number}</h1>
      <p className="mb-4 text-slate-500">Billed to {data.customer}</p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Item</th>
            <th>Qty</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((i) => (
            <tr key={i.name} className="border-b">
              <td className="py-2">{i.name}</td>
              <td>{i.qty}</td>
              <td className="text-right">{money(i.qty * i.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-right text-lg font-semibold">Total: {money(total)}</p>
      <PageBreak />
      <h2 className="text-xl font-semibold">Terms</h2>
      <p className="text-sm">Payment due within 14 days. This page starts on a new sheet.</p>
    </article>
  );
}

export function InvoiceDemo() {
  const { print, exportAs, isPrinting, isExporting } = usePrintContext();
  const content = <Invoice data={invoice} />;

  return (
    <Card
      title="2. Print an unmounted component"
      description="The invoice is never on screen. It renders into the print iframe; the provider wrapper supplies CurrencyContext (UZS)."
    >
      <div className="flex flex-wrap gap-2">
        <button
          className={buttonClass}
          disabled={isPrinting}
          onClick={() => print({ content, documentTitle: invoice.number })}
        >
          Print invoice
        </button>
        <button
          className={buttonClass}
          disabled={isExporting}
          onClick={() => exportAs('pdf', { content, documentTitle: invoice.number })}
        >
          {isExporting ? 'Exporting…' : 'Download PDF'}
        </button>
      </div>
    </Card>
  );
}
