import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';

const external = [
  'react',
  'react-dom',
  'react/*',
  'react-dom/*',
  'jspdf',
  'html2canvas',
  'html-to-image',
];
const cases = {
  'use-print-hook (all exports)': `export * from './dist/index.js';`,
  'use-print-hook (usePrint only)': `export { usePrint } from './dist/index.js';`,
  'use-print-hook/pdf': `export * from './dist/pdf/index.js';`,
  'use-print-hook/image': `export * from './dist/image/index.js';`,
};

const kb = (n) => `${(n / 1024).toFixed(2)} kB`;
const rows = [];
for (const [entry, contents] of Object.entries(cases)) {
  const out = await build({
    stdin: { contents, resolveDir: process.cwd(), loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    external,
    logLevel: 'silent',
  });
  const code = out.outputFiles[0].contents;
  rows.push({ entry, minified: kb(code.length), gzip: kb(gzipSync(code).length) });
}
console.table(rows);
