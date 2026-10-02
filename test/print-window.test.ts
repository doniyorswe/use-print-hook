import { printWindow } from '../src/engine/print-window';

function fakeWindow(onPrint: (w: Window) => void): Window {
  const target = new EventTarget() as unknown as Window;
  Object.assign(target, { focus: vi.fn(), print: vi.fn(() => onPrint(target)) });
  return target;
}

describe('printWindow', () => {
  afterEach(() => vi.useRealTimers());

  it('resolves on afterprint', async () => {
    const win = fakeWindow((w) => w.dispatchEvent(new Event('afterprint')));
    await expect(printWindow(win, window)).resolves.toBeUndefined();
    expect(win.print).toHaveBeenCalledOnce();
  });

  it('falls back to opener focus (Safari)', async () => {
    vi.useFakeTimers();
    const win = fakeWindow(() => {});
    const p = printWindow(win, window);
    vi.advanceTimersByTime(600);
    window.dispatchEvent(new Event('focus'));
    await expect(p).resolves.toBeUndefined();
  });

  it('resolves after the hard cap', async () => {
    vi.useFakeTimers();
    const p = printWindow(
      fakeWindow(() => {}),
      window,
      1000,
    );
    vi.advanceTimersByTime(1000);
    await expect(p).resolves.toBeUndefined();
  });

  it('rejects when print throws', async () => {
    const win = fakeWindow(() => {
      throw new Error('blocked');
    });
    await expect(printWindow(win, window)).rejects.toThrow('blocked');
  });
});
