import { createIframeHost } from '../src/engine/host';
import { prepareDocument } from '../src/engine/prepare';
import { usePrintMode } from '../src/context/print-mode';
import { mergeConfig } from '../src/utils/merge-options';

const signal = new AbortController().signal;

describe('prepareDocument', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('clones an element into an iframe with styles, page css and ignore rules', async () => {
    document.head.innerHTML = '<style>.x { color: red; }</style>';
    document.body.innerHTML =
      '<section id="s"><h1>Hi</h1><button class="uph-no-print">x</button><div class="uph-print-only" style="display:none">paper</div></section>';
    const host = createIframeHost(document, 500);
    const transformClone = vi.fn();
    const config = mergeConfig({
      page: { size: 'A4', margin: '1cm' },
      extraCss: '.y{}',
      transformClone,
    });
    const onSnapshot = vi.fn();

    const prepared = await prepareDocument(
      host,
      { kind: 'element', element: document.getElementById('s')! },
      config,
      'Invoice',
      signal,
      onSnapshot,
    );
    const doc = prepared.host.document;

    expect(doc.title).toBe('Invoice');
    expect(doc.body.querySelector('h1')!.textContent).toBe('Hi');
    expect(prepared.root.ownerDocument).toBe(doc);
    expect((doc.querySelector('.uph-print-only') as HTMLElement).style.display).toBe('');
    const css = Array.from(doc.querySelectorAll('style'), (s) => s.textContent).join('\n');
    expect(css).toContain('.x');
    expect(css).toContain('@page { size: A4; margin: 1cm; }');
    expect(css).toContain('.uph-no-print { display: none !important; }');
    expect(css).toContain('.y{}');
    expect(transformClone).toHaveBeenCalledWith(prepared.root, document.getElementById('s'));
    expect(onSnapshot).toHaveBeenCalledOnce();

    prepared.dispose();
    await new Promise((r) => setTimeout(r, 10));
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('renders unmounted content with print mode and wrapper', async () => {
    function Rows() {
      return <p>{usePrintMode() ? 'all rows' : 'page 1'}</p>;
    }
    function Wrapper({ children }: { children: React.ReactNode }) {
      return <div className="theme">{children}</div>;
    }
    const host = createIframeHost(document, 500);
    const prepared = await prepareDocument(
      host,
      { kind: 'content', node: <Rows /> },
      mergeConfig({ wrapper: Wrapper }),
      't',
      signal,
    );
    expect(prepared.root.querySelector('.theme p')!.textContent).toBe('all rows');
    prepared.dispose();
  });

  it('honours aborts', async () => {
    const controller = new AbortController();
    controller.abort();
    document.body.innerHTML = '<div id="a">a</div>';
    const host = createIframeHost(document, 100);
    await expect(
      prepareDocument(
        host,
        { kind: 'element', element: document.getElementById('a')! },
        mergeConfig(),
        't',
        controller.signal,
      ),
    ).rejects.toThrow('aborted');
  });
});
