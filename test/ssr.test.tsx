// @vitest-environment node
import { renderToString } from 'react-dom/server';
import {
  NoPrint,
  PageBreak,
  PrintOnly,
  PrintProvider,
  PrintTrigger,
  Printable,
  usePrint,
} from '../src';

describe('SSR', () => {
  it('renders without touching window/document', () => {
    function App() {
      const { contentRef } = usePrint();
      return (
        <PrintProvider>
          <Printable id="a" ref={contentRef}>
            <PrintOnly>p</PrintOnly>
            <NoPrint>n</NoPrint>
            <PageBreak />
          </Printable>
          <PrintTrigger render={({ isPrinting }) => <button>{String(isPrinting)}</button>} />
        </PrintProvider>
      );
    }
    expect(typeof window).toBe('undefined');
    const html = renderToString(<App />);
    expect(html).toContain('uph-printable');
    expect(html).toContain('display:none');
  });
});
