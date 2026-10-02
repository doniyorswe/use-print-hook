import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { NoPrint, PrintProvider, Printable, usePrint, usePrintMode } from '../../dist/index.js';
import { createPdfExporter } from '../../dist/pdf/index.js';
import { createImageExporter } from '../../dist/image/index.js';

function record(key: string, value: unknown) {
  window.__result[key] = value;
}

function Rows() {
  return <p id="rows">{usePrintMode() ? 'all rows' : 'page 1'}</p>;
}

function Chart() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current!.getContext('2d')!;
    g.fillStyle = '#f00';
    g.fillRect(0, 0, 50, 50);
  }, []);
  return <canvas id="chart" ref={ref} width={50} height={50} />;
}

function App() {
  const { contentRef, print, exportAs } = usePrint({
    documentTitle: 'E2E',
    page: { size: 'A4', margin: '10mm' },
    exporters: {
      pdf: createPdfExporter({
        save: false,
        onDocument: (pdf) => record('pages', pdf.getNumberOfPages()),
      }),
      png: createImageExporter({ download: false, onDataUrl: (url) => record('png', url.length) }),
    },
  });
  return (
    <>
      <Printable id="report" as="article" ref={contentRef}>
        <h1 className="title">Report</h1>
        <span className="emotion">styled</span>
        <span className="font">font var</span>
        <Rows />
        <Chart />
        <input id="name" defaultValue="" />
        <NoPrint id="hidden">screen only</NoPrint>
        <div style={{ height: 2400 }}>tall</div>
      </Printable>
      <button id="print" onClick={() => print({ target: 'report' })}>
        print
      </button>
      <button id="pdf" onClick={() => exportAs('pdf')}>
        pdf
      </button>
      <button id="png" onClick={() => exportAs('png')}>
        png
      </button>
      <button id="content" onClick={() => print({ content: <h2 className="title">Unmounted</h2> })}>
        content
      </button>
    </>
  );
}

window.__result = {};
const style = document.createElement('style');
document.head.appendChild(style);
style.sheet!.insertRule('.emotion { color: rgb(0, 128, 0); }');
document.documentElement.className = 'font-vars';
createRoot(document.getElementById('root')!).render(
  <PrintProvider>
    <App />
  </PrintProvider>,
);
