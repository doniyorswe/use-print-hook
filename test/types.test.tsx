import { useRef } from 'react';
import { Printable, usePrint, type Exporter } from '../src';

const pdf: Exporter<{ scale: number }> = { name: 'pdf', export: async () => {} };

describe('types', () => {
  it('infers exporter formats and options', () => {
    function C() {
      const api = usePrint({ exporters: { pdf } });
      void api.exportAs('pdf', { exporter: { scale: 2 } });
      // @ts-expect-error unknown format
      void api.exportAs('docx');
      // @ts-expect-error wrong option type
      void api.exportAs('pdf', { exporter: { scale: '2' } });
      expectTypeOf(api.isPrinting).toEqualTypeOf<boolean>();
      return null;
    }
    function D() {
      const api = usePrint();
      void api.exportAs('anything');
      const ref = useRef<HTMLTableElement>(null);
      usePrint({ contentRef: ref });
      return (
        <>
          <div ref={api.contentRef} />
          <table ref={api.contentRef} />
          <Printable as="a" href="/x" id="link" />
          {/* @ts-expect-error href is not a div prop */}
          <Printable href="/x" />
        </>
      );
    }
    expect(C).toBeTypeOf('function');
    expect(D).toBeTypeOf('function');
  });
});
