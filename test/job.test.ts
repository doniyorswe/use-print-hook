import { runJob } from '../src/engine/job';
import { mergeConfig } from '../src/utils/merge-options';
import * as pw from '../src/engine/print-window';

describe('runJob', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="a">hello</div>';
  });
  afterEach(() => vi.restoreAllMocks());

  it('runs callbacks in order and prints the iframe window', async () => {
    const order: string[] = [];
    vi.spyOn(pw, 'printWindow').mockImplementation(async (win) => {
      order.push('print');
      expect(win.document.body.textContent).toContain('hello');
    });
    const setPrintMode = vi.fn(async (on: boolean) => {
      order.push(`mode:${on}`);
    });
    await runJob({
      kind: 'print',
      title: 't',
      config: mergeConfig({
        onBeforePrint: () => void order.push('before'),
        onAfterPrint: () => order.push('after'),
      }),
      resolveSource: () => ({ kind: 'element', element: document.getElementById('a')! }),
      printMode: { setPrintMode },
      signal: new AbortController().signal,
    });
    expect(order).toEqual(['before', 'mode:true', 'mode:false', 'print', 'after']);
  });

  it('passes the prepared element to exporters', async () => {
    const exporter = { name: 'x', export: vi.fn(async () => {}) };
    await runJob({
      kind: 'export',
      title: 'file',
      config: mergeConfig({ page: { size: 'A4' } }),
      resolveSource: () => ({ kind: 'element', element: document.getElementById('a')! }),
      exporter,
      exporterOptions: { scale: 2 },
      signal: new AbortController().signal,
    });
    const [el, ctx] = exporter.export.mock.calls[0] as unknown as [
      HTMLElement,
      { options: unknown; filename: string; document: Document },
    ];
    expect(el.textContent).toBe('hello');
    expect(el.ownerDocument).not.toBe(document);
    expect(ctx.options).toEqual({ scale: 2 });
    expect(ctx.filename).toBe('file');
  });
});
