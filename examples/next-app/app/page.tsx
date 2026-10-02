import { BasicPrint } from './components/basic-print';
import { ChartDemo } from './components/chart';
import { InvoiceDemo } from './components/invoice';
import { OrdersDemo } from './components/orders-table';

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">use-print-hook</h1>
      <p className="mt-2 mb-8 text-slate-600">Headless print &amp; export for React and Next.js.</p>
      <div className="grid gap-6 md:grid-cols-2">
        <BasicPrint />
        <InvoiceDemo />
        <OrdersDemo />
        <ChartDemo />
      </div>
    </main>
  );
}
