import { cloneWithState } from '../src/engine/clone';

describe('cloneWithState', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('copies live form values', () => {
    document.body.innerHTML = `
      <form id="f">
        <input id="t" value="old" />
        <input id="c" type="checkbox" />
        <input id="r" type="radio" checked />
        <textarea id="ta">old</textarea>
        <select id="s"><option value="a">A</option><option value="b">B</option></select>
      </form>`;
    (document.getElementById('t') as HTMLInputElement).value = 'new';
    (document.getElementById('c') as HTMLInputElement).checked = true;
    (document.getElementById('r') as HTMLInputElement).checked = false;
    (document.getElementById('ta') as HTMLTextAreaElement).value = 'typed';
    (document.getElementById('s') as HTMLSelectElement).value = 'b';

    const clone = cloneWithState(document.getElementById('f')!);
    expect(clone.querySelector('#t')!.getAttribute('value')).toBe('new');
    expect(clone.querySelector('#c')!.hasAttribute('checked')).toBe(true);
    expect(clone.querySelector('#r')!.hasAttribute('checked')).toBe(false);
    expect(clone.querySelector('#ta')!.textContent).toBe('typed');
    const options = clone.querySelectorAll('option');
    expect(options[0]!.hasAttribute('selected')).toBe(false);
    expect(options[1]!.hasAttribute('selected')).toBe(true);
  });

  it('replaces canvases with image snapshots and keeps attributes', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAA');
    document.body.innerHTML =
      '<div id="w"><canvas class="chart" width="300" height="150"></canvas><p>after</p></div>';
    const clone = cloneWithState(document.getElementById('w')!);
    const img = clone.querySelector('img')!;
    expect(clone.querySelector('canvas')).toBeNull();
    expect(img.getAttribute('src')).toBe('data:image/png;base64,AAA');
    expect(img.className).toBe('chart');
    expect(img.hasAttribute('width')).toBe(false);
    expect(clone.querySelector('p')!.textContent).toBe('after');
  });

  it('keeps tainted canvases as-is', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new DOMException('tainted', 'SecurityError');
    });
    document.body.innerHTML = '<div id="w"><canvas></canvas></div>';
    const clone = cloneWithState(document.getElementById('w')!);
    expect(clone.querySelector('canvas')).not.toBeNull();
  });

  it('turns lazy images eager', () => {
    document.body.innerHTML = '<div id="w"><img loading="lazy" src="a.png" /></div>';
    const clone = cloneWithState(document.getElementById('w')!);
    expect(clone.querySelector('img')!.getAttribute('loading')).toBe('eager');
  });
});
