const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'OL', 'UL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'CODE', 'IMG', 'A', 'SPAN', 'DIV', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'IFRAME']);
const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE', 'TEXTAREA', 'NOSCRIPT']);
const SAFE_CLASS = /^(ql-align-(center|right|justify)|ql-direction-rtl|ql-indent-[1-8]|ql-size-(small|large|huge)|ql-syntax|ql-video)$/;
const escapeText = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function safeProductUrl(value, kind = 'link') {
  const candidate = String(value || '').trim();
  if (!candidate || [...candidate].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) || candidate.startsWith('//')) return '';
  if (kind === 'image' && /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(candidate)) return candidate;
  if (kind !== 'frame' && !candidate.includes('\\') && (candidate.startsWith('/') || (kind === 'link' && candidate.startsWith('#')))) return candidate;
  try {
    const url = new URL(candidate);
    if (kind === 'frame') {
      return url.protocol === 'https:' && ['www.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)
        && /^\/embed\/[\w-]+$/.test(url.pathname) ? url.href : '';
    }
    if (url.protocol === 'https:' || (kind === 'link' && ['mailto:', 'tel:'].includes(url.protocol))) return url.href;
  } catch { /* Invalid URLs are removed, never interpolated back into markup. */ }
  return '';
}

/** Copies only supported rich-text nodes into a new inert document. Never trusts editor HTML. */
export function sanitizeProductHtml(value) {
  const html = typeof value === 'string' ? value : '';
  if (!globalThis.DOMParser) return escapeText(html);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const clean = document.implementation.createHTMLDocument('');
  const copy = (node, target) => {
    if (node.nodeType === 3) { target.appendChild(clean.createTextNode(node.textContent || '')); return; }
    if (node.nodeType !== 1 || DROP_WITH_CONTENT.has(node.tagName)) return;
    if (!ALLOWED_TAGS.has(node.tagName)) { [...node.childNodes].forEach((child) => copy(child, target)); return; }
    const output = clean.createElement(node.tagName.toLowerCase());
    if (node.tagName === 'IMG') {
      const src = safeProductUrl(node.getAttribute('src'), 'image');
      if (!src) return;
      output.setAttribute('src', src);
      output.setAttribute('alt', (node.getAttribute('alt') || '').slice(0, 300));
      output.setAttribute('loading', 'lazy');
      output.setAttribute('referrerpolicy', 'no-referrer');
    }
    if (node.tagName === 'A') {
      const href = safeProductUrl(node.getAttribute('href'));
      if (href) output.setAttribute('href', href);
      output.setAttribute('rel', 'noopener noreferrer');
      if (node.getAttribute('target') === '_blank') output.setAttribute('target', '_blank');
    }
    if (node.tagName === 'IFRAME') {
      const src = safeProductUrl(node.getAttribute('src'), 'frame');
      if (!src) return;
      output.setAttribute('src', src);
      output.setAttribute('title', (node.getAttribute('title') || '상품 영상').slice(0, 100));
      output.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
      output.setAttribute('loading', 'lazy');
      output.setAttribute('allowfullscreen', '');
    }
    const classes = (node.getAttribute('class') || '').split(/\s+/).filter((value) => SAFE_CLASS.test(value));
    if (classes.length) output.setAttribute('class', classes.join(' '));
    for (const property of ['color', 'background-color']) {
      const color = node.style.getPropertyValue(property);
      if (/^(#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%+-]+\)|[a-z]{1,20})$/i.test(color)) output.style.setProperty(property, color);
    }
    [...node.childNodes].forEach((child) => copy(child, output));
    target.appendChild(output);
  };
  [...parsed.body.childNodes].forEach((node) => copy(node, clean.body));
  return clean.body.innerHTML;
}
