import { mergeConfig, resolveTitle } from '../src/utils/merge-options';

describe('mergeConfig', () => {
  it('applies defaults', () => {
    const c = mergeConfig();
    expect(c.copyStyles).toBe(true);
    expect(c.ignoreSelector).toBe('.uph-no-print');
    expect(c.strategy).toBe('auto');
    expect(c.waitFor).toEqual({ images: true, fonts: true, stylesheets: true, timeoutMs: 5000 });
    expect(c.extraCss).toBe('');
  });

  it('merges provider → hook → call, later wins, undefined ignored', () => {
    const before = () => {};
    const c = mergeConfig(
      {
        documentTitle: 'provider',
        copyStyles: false,
        onBeforePrint: before,
        page: { size: 'A4', margin: { top: '1cm' } },
      },
      {
        documentTitle: 'hook',
        copyStyles: undefined,
        page: { orientation: 'landscape', margin: { left: '2cm' } },
      },
      { documentTitle: 'call', waitFor: { timeoutMs: 100 } },
    );
    expect(c.documentTitle).toBe('call');
    expect(c.copyStyles).toBe(false);
    expect(c.onBeforePrint).toBe(before);
    expect(c.page).toEqual({
      size: 'A4',
      orientation: 'landscape',
      margin: { top: '1cm', left: '2cm' },
    });
    expect(c.waitFor.timeoutMs).toBe(100);
    expect(c.waitFor.images).toBe(true);
  });

  it('replaces string margin and concatenates extraCss', () => {
    const c = mergeConfig(
      { page: { margin: { top: '1cm' } }, extraCss: 'a{}' },
      { page: { margin: '5mm' }, extraCss: 'b{}' },
    );
    expect(c.page.margin).toBe('5mm');
    expect(c.extraCss).toBe('a{}\nb{}');
  });
});

describe('resolveTitle', () => {
  it('supports strings, getters and fallback', () => {
    expect(resolveTitle({ documentTitle: 'x' }, 'f')).toBe('x');
    expect(resolveTitle({ documentTitle: () => 'y' }, 'f')).toBe('y');
    expect(resolveTitle({ documentTitle: '  ' }, 'f')).toBe('f');
    expect(resolveTitle({}, 'f')).toBe('f');
  });
});
