import type * as HtmlToImage from 'html-to-image';
import type { Exporter } from '../types';
import { downloadFile } from '../utils/download';
import { throwIfAborted } from '../utils/env';

type HtmlToImageOptions = NonNullable<Parameters<typeof HtmlToImage.toPng>[1]>;

export interface ImageOptions {
  /** Default `"png"`. */
  type?: 'png' | 'jpeg';
  /** JPEG quality, 0–1. Default `0.95`. */
  quality?: number;
  /** Default: `max(2, devicePixelRatio)`. */
  pixelRatio?: number;
  /** Default `"#ffffff"` (JPEG has no transparency). */
  backgroundColor?: string;
  /** Extra html-to-image options. */
  htmlToImage?: Partial<HtmlToImageOptions>;
  /** Receives the data URL (upload, preview…). */
  onDataUrl?: (dataUrl: string) => void | Promise<void>;
  /** Download as `<filename>.<type>`. Default `true`. */
  download?: boolean;
}

/**
 * PNG/JPEG exporter (html-to-image, loaded on first use).
 *
 * @example
 * usePrint({ exporters: { png: createImageExporter() } }).exportAs('png');
 */
export function createImageExporter(defaults: ImageOptions = {}): Exporter<ImageOptions> {
  return {
    name: 'image',
    async export(element, ctx) {
      const opts = { ...defaults, ...ctx.options };
      let lib: typeof HtmlToImage;
      try {
        lib = await import('html-to-image');
      } catch (cause) {
        throw new Error('use-print-hook/image requires "html-to-image" to be installed', { cause });
      }
      throwIfAborted(ctx.signal);

      const type = opts.type ?? 'png';
      const render = type === 'jpeg' ? lib.toJpeg : lib.toPng;
      const dataUrl = await render(element, {
        pixelRatio: opts.pixelRatio ?? Math.max(2, ctx.window.devicePixelRatio || 1),
        backgroundColor: opts.backgroundColor ?? '#ffffff',
        quality: opts.quality ?? 0.95,
        cacheBust: true,
        ...opts.htmlToImage,
      });
      throwIfAborted(ctx.signal);

      await opts.onDataUrl?.(dataUrl);
      if (opts.download !== false)
        downloadFile(dataUrl, `${ctx.filename}.${type === 'jpeg' ? 'jpg' : 'png'}`);
    },
  };
}
