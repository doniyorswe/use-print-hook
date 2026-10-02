import type { ExportContext } from '../src';
import { createImageExporter } from '../src/image';
import { createPdfExporter } from '../src/pdf';

const pdfCalls = vi.hoisted(() => ({
  addImage: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
  setProperties: vi.fn(),
  ctor: vi.fn(),
}));

vi.mock('jspdf', () => ({
  jsPDF: class {
    constructor(opts: unknown) {
      pdfCalls.ctor(opts);
    }
    addImage = pdfCalls.addImage;
    addPage = pdfCalls.addPage;
    save = pdfCalls.save;
    setProperties = pdfCalls.setProperties;
  },
}));
vi.mock('html-to-image', () => ({
  toPng: vi.fn(async () => 'data:image/png;base64,PNG'),
  toJpeg: vi.fn(async () => 'data:image/jpeg;base64,JPG'),
  toCanvas: vi.fn(async () => {
    const c = document.createElement('canvas');
    c.width = 1000;
    c.height = 3000;
    return c;
  }),
}));

function ctx<O>(options: Partial<O>, page = {}): ExportContext<O> {
  return {
    options,
    filename: 'report',
    page,
    document,
    window,
    signal: new AbortController().signal,
  };
}

describe('exporters', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,X');
  });
  afterEach(() => vi.clearAllMocks());

  it('pdf: slices the canvas into pages of the configured size', async () => {
    const onDocument = vi.fn();
    const exporter = createPdfExporter({ marginMm: 10, onDocument });
    await exporter.export(document.createElement('div'), ctx({}, { size: 'A4' }));

    expect(pdfCalls.ctor).toHaveBeenCalledWith({
      unit: 'mm',
      format: [210, 297],
      orientation: 'portrait',
    });
    expect(pdfCalls.addImage).toHaveBeenCalledTimes(3);
    expect(pdfCalls.addPage).toHaveBeenCalledTimes(2);
    expect(pdfCalls.setProperties).toHaveBeenCalledWith({ title: 'report' });
    expect(onDocument).toHaveBeenCalledOnce();
    expect(pdfCalls.save).toHaveBeenCalledWith('report.pdf');
  });

  it('pdf: accepts a custom rasterizer', async () => {
    const rasterize = vi.fn(async () => {
      const c = document.createElement('canvas');
      c.width = 100;
      c.height = 100;
      return c;
    });
    await createPdfExporter({ rasterize, scale: 3 }).export(document.createElement('div'), ctx({}));
    expect(rasterize).toHaveBeenCalledWith(expect.any(HTMLElement), {
      scale: 3,
      backgroundColor: '#ffffff',
    });
    expect(pdfCalls.addImage).toHaveBeenCalledTimes(1);
  });

  it('pdf: call options override defaults (no save, landscape)', async () => {
    const exporter = createPdfExporter();
    await exporter.export(
      document.createElement('div'),
      ctx({ save: false }, { size: 'A4', orientation: 'landscape' }),
    );
    expect(pdfCalls.ctor).toHaveBeenCalledWith({
      unit: 'mm',
      format: [297, 210],
      orientation: 'landscape',
    });
    expect(pdfCalls.save).not.toHaveBeenCalled();
  });

  it('image: renders and downloads', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const onDataUrl = vi.fn();
    await createImageExporter({ onDataUrl }).export(
      document.createElement('div'),
      ctx({ type: 'jpeg' }),
    );
    expect(onDataUrl).toHaveBeenCalledWith('data:image/jpeg;base64,JPG');
    expect(click).toHaveBeenCalledOnce();
  });
});
