'use client';

import { NoPrint, PrintOnly, usePrint } from 'use-print-hook';
import { buttonClass, Card } from './card';

export function BasicPrint() {
  const { contentRef, print, isPrinting } = usePrint({ documentTitle: 'Receipt' });

  return (
    <Card
      title="1. Basic print"
      description="usePrint + contentRef. Tailwind and next/font are copied into the print document."
    >
      <div ref={contentRef} className="rounded-xl bg-indigo-50 p-4">
        <h3 className="text-xl font-bold text-indigo-700">Receipt #1024</h3>
        <p className="text-sm">Thanks for your purchase.</p>
        <label className="mt-3 block text-sm">
          Note:{' '}
          <input className="ml-2 rounded border px-2 py-1" placeholder="typed values are printed" />
        </label>
        <NoPrint className="mt-2 text-xs text-rose-600">Only visible on screen</NoPrint>
        <PrintOnly className="mt-2 text-xs text-emerald-700">Only visible on paper</PrintOnly>
      </div>
      <button className={`${buttonClass} mt-4`} onClick={() => print()} disabled={isPrinting}>
        {isPrinting ? 'Printing…' : 'Print receipt'}
      </button>
    </Card>
  );
}
