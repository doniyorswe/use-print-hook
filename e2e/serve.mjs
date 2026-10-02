import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('./fixture/', import.meta.url));
const result = await build({
  entryPoints: [`${dir}app.tsx`],
  bundle: true,
  format: 'esm',
  write: false,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"' },
});
const bundle = result.outputFiles[0].contents;
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript' };

createServer(async (req, res) => {
  const path = req.url === '/' ? '/index.html' : req.url;
  if (path === '/bundle.js') {
    res.writeHead(200, { 'content-type': types.js }).end(bundle);
    return;
  }
  try {
    const body = await readFile(`${dir}${path.slice(1)}`);
    res.writeHead(200, { 'content-type': types[path.split('.').pop()] ?? 'text/plain' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(4321, () => console.log('fixture on http://localhost:4321'));
