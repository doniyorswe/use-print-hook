'use client';

import { useEffect, useRef } from 'react';
import { usePrint } from 'use-print-hook';
import { createPdfExporter } from 'use-print-hook/pdf';
import { buttonClass, Card } from './card';

const exporters = { pdf: createPdfExporter({ imageType: 'png' }) };
const values = [12, 19, 7, 25, 16, 30, 22];

export function ChartDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { contentRef, print, exportAs } = usePrint({
    exporters,
    documentTitle: 'Weekly volume',
    page: { orientation: 'landscape' },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    const w = canvas.width / values.length;
    g.clearRect(0, 0, canvas.width, canvas.height);
    values.forEach((v, i) => {
      g.fillStyle = '#6366f1';
      g.fillRect(i * w + 8, canvas.height - v * 5, w - 16, v * 5);
    });
  }, []);

  return (
    <Card
      title="4. Canvas & hook-level exporter"
      description="Canvases are snapshotted to <img>. This hook registers its own PDF exporter, typed by name."
    >
      <div ref={contentRef}>
        <h3 className="mb-2 font-medium">Weekly volume</h3>
        <canvas ref={canvasRef} width={420} height={160} className="w-full max-w-md" />
      </div>
      <div className="mt-4 flex gap-2">
        <button className={buttonClass} onClick={() => print()}>
          Print chart
        </button>
        <button className={buttonClass} onClick={() => exportAs('pdf', { exporter: { scale: 3 } })}>
          PDF (landscape)
        </button>
      </div>
    </Card>
  );
}
