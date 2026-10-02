import { compilePageCss } from '../src/engine/page-css';
import { lengthToMm, pageSizeMm } from '../src/engine/page-size';

describe('compilePageCss', () => {
  it('returns empty string for no options', () => {
    expect(compilePageCss()).toBe('');
  });
  it('compiles named size, orientation and margins', () => {
    expect(compilePageCss({ size: 'A4', orientation: 'landscape', margin: '10mm' })).toBe(
      '@page { size: A4 landscape; margin: 10mm; }',
    );
    expect(compilePageCss({ margin: { top: '1cm', left: '2cm' } })).toBe(
      '@page { margin-top: 1cm; margin-left: 2cm; }',
    );
  });
  it('swaps explicit dimensions for landscape', () => {
    expect(compilePageCss({ size: ['80mm', '200mm'], orientation: 'landscape' })).toBe(
      '@page { size: 200mm 80mm; }',
    );
  });
});

describe('page sizes', () => {
  it('converts lengths', () => {
    expect(lengthToMm('1in')).toBeCloseTo(25.4);
    expect(lengthToMm('96px')).toBeCloseTo(25.4);
    expect(lengthToMm('auto')).toBeNull();
  });
  it('resolves named and explicit sizes', () => {
    expect(pageSizeMm({ size: 'A4' })).toEqual([210, 297]);
    expect(pageSizeMm({ size: 'a4', orientation: 'landscape' })).toEqual([297, 210]);
    expect(pageSizeMm({ size: ['80mm', '100mm'] })).toEqual([80, 100]);
    expect(pageSizeMm({ size: 'weird' })).toBeNull();
  });
});
