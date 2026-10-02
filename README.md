# use-print-hook

Headless print and export for React and Next.js. One hook returns methods and state, an optional provider shares defaults, and a few small components handle targets and visibility. The API is modeled on react-hook-form.

- Zero runtime dependencies in core (~5 kB gzip). PDF and PNG exporters are opt-in subpaths.
- Copies every stylesheet, including CSS-in-JS rules injected at runtime (Tailwind, emotion/Chakra, MUI, styled-components) and `next/font` variables.
- Prints mounted elements or components that are never on screen.
- SSR-safe, `"use client"` entry points, React 18 and 19.

```bash
pnpm add use-print-hook
# optional exporters
pnpm add jspdf html-to-image
```

## Quick start

```tsx
'use client';
import { usePrint, NoPrint } from 'use-print-hook';

export function Receipt() {
  const { contentRef, print, isPrinting } = usePrint({
    documentTitle: 'Receipt',
    page: { size: 'A4', margin: '12mm' },
  });

  return (
    <>
      <div ref={contentRef}>
        <h1>Receipt #1024</h1>
        <NoPrint>Only visible on screen</NoPrint>
      </div>
      <button onClick={() => print()} disabled={isPrinting}>
        Print
      </button>
    </>
  );
}
```

> Destructure the hook result (`const { contentRef } = usePrint()`), like react-hook-form. Writing `ref={api.contentRef}` triggers the React Compiler `react-hooks/refs` lint rule.

## How it works

1. `onBeforePrint` runs. If the target is a `<Printable>`, it re-renders in print mode.
2. The target is cloned into a hidden iframe, or unmounted `content` is rendered there with `createRoot`. The clone keeps canvas pixels (converted to `<img>`), input, textarea, select and checkbox values, and loads lazy images eagerly.
3. Stylesheets, `<html>`/`<body>` attributes, the `@page` rule, base CSS and `extraCss` are added.
4. Images, stylesheets and fonts are awaited, up to `waitFor.timeoutMs`.
5. The iframe prints, or an exporter receives the prepared element. Then the iframe is removed.

---

## API

### `usePrint(options?)`

```ts
function usePrint<E extends ExporterMap = {}>(options?: UsePrintOptions<E>): UsePrintReturn<E>;
```

| Option           | Type                                                          | Default               |
| ---------------- | ------------------------------------------------------------- | --------------------- |
| `contentRef`     | `RefObject<HTMLElement \| null> \| () => HTMLElement \| null` | returned `contentRef` |
| `documentTitle`  | `string \| () => string`                                      | `document.title`      |
| `page`           | `{ size?, orientation?, margin? }`                            | browser default       |
| `copyStyles`     | `boolean`                                                     | `true`                |
| `extraCss`       | `string`                                                      | none                  |
| `ignoreSelector` | `string`                                                      | `".uph-no-print"`     |
| `waitFor`        | `{ images?, fonts?, stylesheets?, timeoutMs? }`               | all `true`, `5000`    |
| `strategy`       | `'auto' \| 'iframe' \| 'window'`                              | `'auto'`              |
| `wrapper`        | `ComponentType<{ children }>`                                 | none                  |
| `exporters`      | `Record<string, Exporter>`                                    | none                  |
| `onBeforePrint`  | `() => void \| Promise<void>`                                 |                       |
| `onAfterPrint`   | `() => void`                                                  |                       |
| `onError`        | `(error: Error) => void`                                      |                       |
| `transformClone` | `(clone: HTMLElement, original: HTMLElement \| null) => void` |                       |

`page.size` accepts `'A3' | 'A4' | 'A5' | 'B4' | 'B5' | 'Letter' | 'Legal' | 'Ledger'`, any CSS `size` keyword, or `['80mm', '200mm']`. `page.margin` accepts a CSS shorthand or `{ top, right, bottom, left }`.

Returns:

| Field         | Type                                                     |
| ------------- | -------------------------------------------------------- |
| `print`       | `(options?: PrintCallOptions) => Promise<void>`          |
| `exportAs`    | `(format, options?: ExportCallOptions) => Promise<void>` |
| `isPrinting`  | `boolean`                                                |
| `isExporting` | `boolean`                                                |
| `error`       | `Error \| null`                                          |
| `contentRef`  | callback ref with `.current`, works on any element       |

`print` and `exportAs` never reject. Errors go to `error` and `onError`. Only one job runs at a time across the app, so a second call while one is running returns the running promise.

**Call options** (`print(options)`, `exportAs(format, options)`): every config option above, plus:

- `target`: id of a mounted `<Printable>`
- `content`: a React node to print without mounting it
- `contentRef`: overrides the hook's ref for this call
- `exporter` (`exportAs` only): options for the exporter

**Merge order:** provider → hook → call. Later layers win. `undefined` never overrides. `page` and `waitFor` are deep-merged, `extraCss` is concatenated, and `exporters` are merged by name.

`exportAs` is typed from the hook's `exporters`. The format name and its options are checked:

```ts
const { exportAs } = usePrint({ exporters: { pdf: createPdfExporter() } });
exportAs('pdf', { exporter: { scale: 3 } }); // ok
exportAs('docx'); // type error
```

If the hook registers no exporters, any string is accepted, so provider exporters still work.

### `<PrintProvider config>`

Sets defaults for every `usePrint` inside it (`PrintConfig` plus `exporters`) and creates a shared instance. Nested providers merge. Config is read when a job starts, so changing it doesn't re-render consumers.

```tsx
<PrintProvider
  config={{
    page: { size: 'A4', margin: '12mm' },
    exporters: { pdf: createPdfExporter(), png: createImageExporter() },
    wrapper: AppProviders, // theme / i18n / QueryClient for unmounted `content`
  }}
>
  {children}
</PrintProvider>
```

### `usePrintContext()`

Returns the provider's shared instance, like `useFormContext`. It throws when there is no provider above it.

### `usePrintMode()`

Returns `true` while rendering for print: inside unmounted `content`, or inside a `<Printable>` that is being printed.

```tsx
function OrdersTable() {
  const printMode = usePrintMode();
  const rows = printMode ? allRows : allRows.slice(page * 10, page * 10 + 10);
  // …
}
```

> `cloneNode` copies static DOM, so print mode can't reach a plain `contentRef` element. Use `<Printable>` or `content`. With `<Printable>`, the subtree briefly re-renders on screen during the snapshot.

### Components

Every component accepts `as` (polymorphic, typed by the element), `className`, and forwards its ref. Default classes are prefixed `uph-`.

| Component                                     | Behaviour                                                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `<Printable id? as?>`                         | Registers a target for `print({ target: id })` and provides print mode. Class `uph-printable`, attribute `data-uph-target`. |
| `<PrintOnly>`                                 | Visible only in the output. Hidden on screen with an inline `display: none`.                                                |
| `<NoPrint>`                                   | Visible only on screen. Class `uph-no-print`. Not rendered in print mode.                                                   |
| `<PageBreak />`                               | `break-after: page`.                                                                                                        |
| `<PrintTrigger render control? …callOptions>` | Render prop, like RHF `Controller`. Uses `control` (from `usePrint`) or the provider instance.                              |

```tsx
<Printable id="invoice">…</Printable>

<PrintTrigger
  target="invoice"
  documentTitle="Invoice"
  render={({ print, exportAs, isPrinting }) => (
    <>
      <Button onClick={() => print()} loading={isPrinting}>Print</Button>
      <Button onClick={() => exportAs('pdf')}>PDF</Button>
    </>
  )}
/>
```

### Printing an unmounted component

```tsx
const { print, exportAs } = usePrintContext();
print({ content: <Invoice data={invoice} />, documentTitle: invoice.number });
exportAs('pdf', { content: <Invoice data={invoice} /> });
```

The node is rendered with `createRoot` into the print iframe, with print mode on. It doesn't share your app's React tree, so pass providers through `wrapper`. Suspended subtrees are not awaited. Load data first, or await it in `onBeforePrint`.

### Utilities

- `compilePageCss(page)` returns the `@page` rule string.
- `downloadFile(blobOrUrl, filename)` downloads a file, which is useful in custom exporters.
- `NO_PRINT_CLASS`, `PRINT_ONLY_CLASS`, `PAGE_BREAK_CLASS`, `PRINTABLE_CLASS`, `DEFAULT_IGNORE_SELECTOR`.

---

## Exporters

### PDF: `use-print-hook/pdf`

```ts
import { createPdfExporter } from 'use-print-hook/pdf';

createPdfExporter({
  scale: 2, // default max(2, devicePixelRatio)
  imageType: 'jpeg', // or 'png'
  quality: 0.95,
  marginMm: 10, // default: page.margin if it is a single length
  backgroundColor: '#fff',
  save: true, // false + onDocument to upload instead
  onDocument: (pdf) => {}, // jsPDF instance
  rasterize: undefined, // custom element → canvas
});
```

Requires `jspdf` and `html-to-image`, both loaded with a dynamic import on first use. The page size and orientation come from `page`. The element is rasterized once and sliced into pages. As a result, text in the PDF is not selectable and `<PageBreak>` is ignored. For vector PDFs, use a server-side exporter (see below).

To use html2canvas instead (or `html2canvas-pro` for `oklch` colors):

```ts
import html2canvas from 'html2canvas-pro';
createPdfExporter({
  rasterize: (el, { scale, backgroundColor }) => html2canvas(el, { scale, backgroundColor }),
});
```

### Image: `use-print-hook/image`

```ts
import { createImageExporter } from 'use-print-hook/image';

createImageExporter({ type: 'png', pixelRatio: 2, download: true, onDataUrl: (url) => {} });
```

Requires `html-to-image`.

### Writing a custom exporter

```ts
import { downloadFile, type Exporter } from 'use-print-hook';

export const htmlExporter: Exporter = {
  name: 'html',
  async export(element, { filename, document, signal }) {
    const css = Array.from(document.querySelectorAll('style'), (s) => s.textContent).join('\n');
    const html = `<!doctype html><style>${css}</style>${element.outerHTML}`;
    if (signal.aborted) return;
    downloadFile(new Blob([html], { type: 'text/html' }), `${filename}.html`);
  },
};
```

`element` is the prepared output inside the hidden print document. Styles are copied, `ignoreSelector` is applied and `transformClone` has run. `ExportContext` gives you `options`, `filename`, `page`, `document`, `window` and `signal`.

Server-side (Puppeteer) exporter for vector PDFs:

```ts
export const serverPdf: Exporter = {
  name: 'server-pdf',
  async export(_element, { document, filename, signal }) {
    const res = await fetch('/api/pdf', {
      method: 'POST',
      body: document.documentElement.outerHTML, // server: page.setContent(html); page.pdf()
      signal,
    });
    downloadFile(await res.blob(), `${filename}.pdf`);
  },
};
```

---

## Recipes

### Next.js App Router

Every entry point ships with `"use client"`. Put the provider in a client `providers.tsx` and render it from `layout.tsx`. `next/font` works because the `<html>` and `<body>` classes, which carry the font CSS variables, are copied. See [`examples/next-app`](./examples/next-app).

### Chakra UI, MUI, emotion, styled-components

No setup is needed. In production these libraries inject rules with `insertRule`, so the `<style>` tags have no text. use-print-hook reads the rules from the CSSOM instead. For unmounted `content`, pass your `ChakraProvider` or `ThemeProvider` as `wrapper`.

### Charts (Chart.js, ECharts, Recharts)

Canvases are snapshotted to `<img>` before printing. SVG charts are copied as they are. Turn off animations, or wait for them to finish in `onBeforePrint`, so the snapshot isn't taken mid-animation.

### Maps (Mapbox GL, MapLibre, Google Maps WebGL)

A WebGL canvas is blank when read back unless the drawing buffer is kept:

```ts
new mapboxgl.Map({ container, style, preserveDrawingBuffer: true });
```

Tiles from other origins must allow CORS, or the canvas becomes tainted. A tainted canvas is printed blank and doesn't break the print.

### Page CSS and custom DOM

```ts
usePrint({
  page: { size: ['80mm', '200mm'], margin: '4mm' }, // thermal receipt
  extraCss: '.table { font-size: 10pt }',
  transformClone: (clone) => clone.querySelectorAll('[data-sensitive]').forEach((n) => n.remove()),
});
```

---

## Browser notes and limitations

- **Safari:** `print()` returns before the dialog closes and `afterprint` is unreliable. Completion falls back to the `print` media query, focus returning to the page, or a 5-minute cap.
- **iOS / iPadOS:** iframe printing often prints the parent page, so `strategy: 'auto'` opens a new window there. The window is opened synchronously in the click handler to avoid popup blockers. If it is blocked anyway, the iframe is used. Set `strategy: 'iframe'` to opt out.
- Cross-origin stylesheets are linked, not inlined, and are awaited. Cross-origin images need CORS headers for the PDF and PNG exporters.
- Shadow DOM content and `<video>` frames are not snapshotted.
- Only one job runs at a time across the app.
- In tests, don't `await` a `<Printable>` print inside `act()`. The print-mode re-render waits for React to commit, and `act` holds that commit back. Fire the print inside `act`, then use `waitFor`.

## Design notes (deviations from the original spec)

- **Name:** the package is `use-print-hook`, the class prefix is `uph-`, and the default `ignoreSelector` is `.uph-no-print`.
- **PDF rasterizer:** html-to-image replaces html2canvas, because html2canvas 1.4 can't parse the `oklch()` and `lab()` colors that Tailwind v4 emits. You can still plug in html2canvas through `rasterize`.
- **`PrintPreview`:** dropped. Real pagination preview is a layout engine of its own.
- **Exporters:** they receive the prepared clone instead of the live element, so options behave the same for print and export.
- **Errors:** `print` and `exportAs` resolve instead of rejecting, so `onClick={() => print()}` never causes an unhandled rejection.

## Development

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e          # Playwright (Chromium)
pnpm size              # gzip size per entry
pnpm --filter use-print-hook-next-example dev
```

## Publishing

- **npm:** run `pnpm changeset` and merge to `main`. The Release workflow opens a version PR, and merging it publishes. The workflow needs an `NPM_TOKEN` secret.
- **GitHub Packages:** after an npm release, the same workflow publishes `@doniyorswe/use-print-hook` to `npm.pkg.github.com`. Consumers add `@doniyorswe:registry=https://npm.pkg.github.com` to `.npmrc`.
- **Manual:** run `pnpm build && npm publish`.

MIT
