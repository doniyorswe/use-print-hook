import type { jsPDF } from 'jspdf';
import { lengthToMm, pageSizeMm } from '../engine/page-size';
import type { Exporter, PageOptions } from '../types';
import { throwIfAborted } from '../utils/env';

/** Turns the element into a canvas. Swap in html2canvas(-pro) or anything else. */
export type Rasterize = (
  element: HTMLElement,
  options: { scale: number; backgroundColor: string },
) => Promise<HTMLCanvasElement>;

export interface PdfOptions {
  /** Render scale. Default: `max(2, devicePixelRatio)`. */
  scale?: number;
  /** Image format embedded in the PDF. Default `"jpeg"` (smaller files). */
  imageType?: 'jpeg' | 'png';
  /** JPEG quality, 0–1. Default `0.95`. */
  quality?: number;
  /** Page margin in mm. Default: `page.margin` when it is a single length, else `0`. */
  marginMm?: number;
  /** Canvas background. Default `"#ffffff"`. */
  backgroundColor?: string;
  /** Custom rasterizer. Default: html-to-image `toCanvas` (supports modern CSS such as `oklch()`). */
  rasterize?: Rasterize;
  /** Called with the finished document before saving (add metadata, upload, etc.). */
  onDocument?: (pdf: jsPDF) => void | Promise<void>;
  /** Save to disk as `<filename>.pdf`. Default `true`. */
  save?: boolean;
}

async function load<T>(loader: () => Promise<T>, pkg: string): Promise<T> {
  try {
    return await loader();
  } catch (cause) {
    throw new Error(`use-print-hook/pdf requires "${pkg}" to be installed`, { cause });
  }
}

const defaultRasterize: Rasterize = async (element, { scale, backgroundColor }) => {
  const { toCanvas } = await load(() => import('html-to-image'), 'html-to-image');
  return toCanvas(element, { pixelRatio: scale, backgroundColor, cacheBust: true });
};

function marginFromPage(page: PageOptions): number {
  return typeof page.margin === 'string' ? (lengthToMm(page.margin) ?? 0) : 0;
}

/**
 * PDF exporter: rasterizes the element (html-to-image by default) and paginates it with jsPDF.
 * Both libraries load on first use.
 * The element is rasterized once and sliced into page-height strips, so text is not selectable
 * and `<PageBreak>` is not honored. For vector PDFs use a server-side exporter (e.g. Puppeteer).
 *
 * @example
 * usePrint({ exporters: { pdf: createPdfExporter({ marginMm: 10 }) } }).exportAs('pdf');
 */
export function createPdfExporter(defaults: PdfOptions = {}): Exporter<PdfOptions> {
  return {
    name: 'pdf',
    async export(element, ctx) {
      const opts = { ...defaults, ...ctx.options };
      const { jsPDF: JsPDF } = await load(() => import('jspdf'), 'jspdf');
      throwIfAborted(ctx.signal);

      const backgroundColor = opts.backgroundColor ?? '#ffffff';
      const canvas = await (opts.rasterize ?? defaultRasterize)(element, {
        scale: opts.scale ?? Math.max(2, ctx.window.devicePixelRatio || 1),
        backgroundColor,
      });
      throwIfAborted(ctx.signal);

      const [pageW, pageH] = pageSizeMm(ctx.page) ?? [210, 297];
      const margin = opts.marginMm ?? marginFromPage(ctx.page);
      const contentW = pageW - margin * 2;
      const contentH = pageH - margin * 2;
      const pxPerMm = canvas.width / contentW;
      const slicePx = Math.floor(contentH * pxPerMm);
      const type = opts.imageType ?? 'jpeg';
      const mime = `image/${type}`;

      const pdf = new JsPDF({
        unit: 'mm',
        format: [pageW, pageH],
        orientation: pageW > pageH ? 'landscape' : 'portrait',
      });
      pdf.setProperties({ title: ctx.filename });

      const slice = ctx.document.createElement('canvas');
      slice.width = canvas.width;
      const g = slice.getContext('2d');
      if (!g) throw new Error('use-print-hook/pdf: 2D canvas is not available');

      for (let y = 0, page = 0; y < canvas.height; y += slicePx, page++) {
        const h = Math.min(slicePx, canvas.height - y);
        slice.height = h;
        g.fillStyle = backgroundColor;
        g.fillRect(0, 0, slice.width, h);
        g.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (page > 0) pdf.addPage([pageW, pageH], pageW > pageH ? 'landscape' : 'portrait');
        pdf.addImage(
          slice.toDataURL(mime, opts.quality ?? 0.95),
          type.toUpperCase(),
          margin,
          margin,
          contentW,
          h / pxPerMm,
        );
      }

      await opts.onDocument?.(pdf);
      if (opts.save !== false) pdf.save(`${ctx.filename}.pdf`);
    },
  };
}
