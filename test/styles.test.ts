import { copyRootAttributes, copyStyles } from '../src/engine/styles';

function makeDoc(): Document {
  return document.implementation.createHTMLDocument('target');
}

describe('styles', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.documentElement.removeAttribute('class');
    document.documentElement.removeAttribute('style');
    document.body.removeAttribute('data-theme');
  });

  it('copies <style> text, CSSOM-injected rules and <link> tags in order', () => {
    document.head.innerHTML = `
      <style>.a { color: red; }</style>
      <link rel="stylesheet" href="/app.css" media="print" />
      <style id="emotion"></style>`;
    (document.getElementById('emotion') as HTMLStyleElement).sheet!.insertRule(
      '.css-1 { color: blue; }',
    );

    const target = makeDoc();
    const links = copyStyles(document, target);
    const nodes = Array.from(target.head.querySelectorAll('style, link'));

    expect(nodes.map((n) => n.tagName)).toEqual(['STYLE', 'LINK', 'STYLE']);
    expect(nodes[0]!.textContent).toContain('.a');
    expect((nodes[1] as HTMLLinkElement).href).toMatch(/\/app\.css$/);
    expect((nodes[1] as HTMLLinkElement).media).toBe('print');
    expect(nodes[2]!.textContent).toContain('.css-1');
    expect(links).toHaveLength(1);
  });

  it('mirrors html/body attributes (next/font classes, CSS vars, theme)', () => {
    document.documentElement.className = '__variable_abc dark';
    document.documentElement.style.setProperty('--brand', 'red');
    document.body.setAttribute('data-theme', 'night');
    const target = makeDoc();
    copyRootAttributes(document, target);
    expect(target.documentElement.className).toBe('__variable_abc dark');
    expect(target.documentElement.style.getPropertyValue('--brand')).toBe('red');
    expect(target.body.getAttribute('data-theme')).toBe('night');
  });
});
