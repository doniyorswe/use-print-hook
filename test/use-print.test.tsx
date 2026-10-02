import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef, useState, type ReactNode } from 'react';
import {
  NoPrint,
  PageBreak,
  PrintOnly,
  PrintProvider,
  PrintTrigger,
  Printable,
  usePrint,
  usePrintContext,
  usePrintMode,
  type Exporter,
} from '../src';
import * as pw from '../src/engine/print-window';

interface Snapshot {
  title: string;
  css: string;
  body: HTMLDivElement;
}
let printed: Snapshot[] = [];

beforeEach(() => {
  printed = [];
  vi.spyOn(pw, 'printWindow').mockImplementation(async (win) => {
    const body = document.createElement('div');
    body.innerHTML = win.document.body.innerHTML;
    printed.push({ title: win.document.title, css: win.document.head.textContent ?? '', body });
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  document.title = '';
});

const lastBody = () => printed.at(-1)!.body;

describe('usePrint', () => {
  it('prints the element attached to the returned contentRef', async () => {
    const onBeforePrint = vi.fn();
    const onAfterPrint = vi.fn();
    function App() {
      const { contentRef, print, isPrinting } = usePrint({
        documentTitle: 'Invoice',
        onBeforePrint,
        onAfterPrint,
      });
      return (
        <>
          <section ref={contentRef}>
            <h1>Total</h1>
            <NoPrint>screen only</NoPrint>
          </section>
          <button onClick={() => print()}>{isPrinting ? 'busy' : 'print'}</button>
        </>
      );
    }
    render(<App />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('busy');
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('print'));

    expect(pw.printWindow).toHaveBeenCalledOnce();
    expect(lastBody().querySelector('h1')).toHaveTextContent('Total');
    expect(printed[0]!.title).toBe('Invoice');
    expect(onBeforePrint).toHaveBeenCalledOnce();
    expect(onAfterPrint).toHaveBeenCalledOnce();
  });

  it('accepts a user ref and ignores concurrent calls', async () => {
    let api!: ReturnType<typeof usePrint>;
    function App() {
      const ref = useRef<HTMLDivElement>(null);
      api = usePrint({ contentRef: ref });
      return <div ref={ref}>content</div>;
    }
    render(<App />);
    let a!: Promise<void>, b!: Promise<void>;
    act(() => {
      a = api.print();
      b = api.print();
    });
    expect(a).toBe(b);
    await act(() => a);
    expect(pw.printWindow).toHaveBeenCalledTimes(1);
  });

  it('reports errors through state and onError without rejecting', async () => {
    const onError = vi.fn();
    let api!: ReturnType<typeof usePrint>;
    function App() {
      api = usePrint({ onError });
      return <p>{api.error?.message ?? 'ok'}</p>;
    }
    render(<App />);
    await act(() => api.print());
    expect(onError).toHaveBeenCalledOnce();
    expect(screen.getByText(/nothing to print/)).toBeInTheDocument();
    await act(() => api.print({ target: 'missing' }));
    expect(screen.getByText(/no <Printable id="missing">/)).toBeInTheDocument();
  });

  it('prints unmounted content in print mode', async () => {
    function Table() {
      return <p>{usePrintMode() ? 'all rows' : 'page 1'}</p>;
    }
    let api!: ReturnType<typeof usePrint>;
    function App() {
      api = usePrint();
      return null;
    }
    render(<App />);
    await act(() => api.print({ content: <Table /> }));
    expect(lastBody()).toHaveTextContent('all rows');
  });

  it('re-renders a <Printable> target in print mode for the snapshot only', async () => {
    function Rows() {
      return <span>{usePrintMode() ? 'all 100 rows' : 'first 10 rows'}</span>;
    }
    let api!: ReturnType<typeof usePrint>;
    function App() {
      api = usePrint();
      return (
        <Printable id="report" as="section" className="card">
          <Rows />
          <PrintOnly>signature</PrintOnly>
          <PageBreak />
        </Printable>
      );
    }
    const { container } = render(<App />);
    act(() => {
      void api.print({ target: 'report' });
    });
    await waitFor(() => expect(pw.printWindow).toHaveBeenCalled());
    await waitFor(() => expect(container).toHaveTextContent('first 10 rows'));

    expect(lastBody()).toHaveTextContent('all 100 rows');
    expect(lastBody().querySelector('section.uph-printable.card')).not.toBeNull();
    expect((lastBody().querySelector('.uph-print-only') as HTMLElement).style.display).toBe('');
    expect((container.querySelector('.uph-print-only') as HTMLElement).style.display).toBe('none');
  });

  it('cleans up the iframe and stops on unmount', async () => {
    let resolveBefore!: () => void;
    let api!: ReturnType<typeof usePrint>;
    function App() {
      api = usePrint({ onBeforePrint: () => new Promise<void>((r) => (resolveBefore = r)) });
      return <div ref={api.contentRef}>x</div>;
    }
    const { unmount } = render(<App />);
    let p!: Promise<void>;
    act(() => {
      p = api.print();
    });
    unmount();
    resolveBefore();
    await p;
    await new Promise((r) => setTimeout(r, 10));
    expect(pw.printWindow).not.toHaveBeenCalled();
    expect(document.querySelector('iframe')).toBeNull();
  });
});

describe('PrintProvider', () => {
  it('merges provider → hook → call and shares exporters and wrapper', async () => {
    const exported: { el: HTMLElement; filename: string; options: unknown }[] = [];
    const json: Exporter<{ pretty: boolean }> = {
      name: 'json',
      async export(el, ctx) {
        exported.push({ el, filename: ctx.filename, options: ctx.options });
      },
    };
    function Theme({ children }: { children?: ReactNode }) {
      return <div className="theme">{children}</div>;
    }
    let api!: ReturnType<typeof usePrint>;
    function Child() {
      api = usePrint({ documentTitle: 'hook' });
      return null;
    }
    render(
      <PrintProvider
        config={{
          documentTitle: 'provider',
          exporters: { json },
          wrapper: Theme,
          extraCss: '.p{}',
        }}
      >
        <Child />
      </PrintProvider>,
    );

    await act(() => api.print({ content: <b>hi</b> }));
    expect(printed[0]!.title).toBe('hook');
    expect(lastBody().querySelector('.theme b')).toHaveTextContent('hi');
    expect(printed[0]!.css).toContain('.p{}');

    await act(() =>
      api.exportAs('json', {
        content: <i>x</i>,
        documentTitle: 'call',
        exporter: { pretty: true },
      }),
    );
    expect(exported[0]!.filename).toBe('call');
    expect(exported[0]!.options).toEqual({ pretty: true });
    expect(exported[0]!.el.querySelector('i')).toHaveTextContent('x');
  });

  it('exposes a shared instance to usePrintContext and PrintTrigger', async () => {
    function Status() {
      const { isPrinting } = usePrintContext();
      return <span data-testid="status">{isPrinting ? 'printing' : 'idle'}</span>;
    }
    render(
      <PrintProvider>
        <Printable id="doc">Doc</Printable>
        <Status />
        <PrintTrigger
          target="doc"
          render={({ print }) => <button onClick={() => print()}>go</button>}
        />
      </PrintProvider>,
    );
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByTestId('status')).toHaveTextContent('printing');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('idle'));
    expect(lastBody()).toHaveTextContent('Doc');
  });

  it('PrintTrigger accepts an explicit control', async () => {
    function App() {
      const control = usePrint();
      const [n] = useState(1);
      return (
        <>
          <div ref={control.contentRef}>item {n}</div>
          <PrintTrigger
            control={control}
            render={({ print }) => <button onClick={() => print()}>p</button>}
          />
        </>
      );
    }
    render(<App />);
    fireEvent.click(screen.getByText('p'));
    await waitFor(() => expect(pw.printWindow).toHaveBeenCalled());
    expect(lastBody()).toHaveTextContent('item 1');
  });

  it('usePrintContext throws outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Bad() {
      usePrintContext();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/inside <PrintProvider>/);
  });

  it('reports unknown exporters', async () => {
    let api!: ReturnType<typeof usePrint>;
    function App() {
      api = usePrint();
      return null;
    }
    render(<App />);
    await act(() => api.exportAs('pdf', { content: <p /> }));
    expect(api.error?.message).toMatch(/no exporter registered for "pdf"/);
  });
});
