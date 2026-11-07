import mammoth from 'mammoth/mammoth.browser.js';
import { parseFragment } from 'parse5';
import { finishPassages, safeHref } from './passages.js';

const MAX_DOCX_BYTES = 15 * 1024 * 1024;
const MAX_HTML_CHARS = 8 * 1024 * 1024;

function attribute(node, name) { return node.attrs?.find(item => item.name === name)?.value ?? null; }

function collectRuns(node, style = { bold: false, italic: false, href: null }) {
  if (node.nodeName === '#text') return node.value ? [{ text: node.value, ...style }] : [];
  if (node.tagName === 'br') return [{ text: ' ', ...style }];
  if (!node.childNodes?.length || ['img', 'script', 'style', 'svg'].includes(node.tagName)) return [];
  const next = { bold: style.bold || ['strong', 'b'].includes(node.tagName), italic: style.italic || ['em', 'i'].includes(node.tagName), href: node.tagName === 'a' ? safeHref(attribute(node, 'href')) : style.href };
  return node.childNodes.flatMap(child => collectRuns(child, next));
}

function normalizeRuns(runs) {
  const merged = [];
  for (const run of runs) {
    const last = merged.at(-1);
    if (last && last.bold === run.bold && last.italic === run.italic && last.href === run.href) last.text += run.text;
    else merged.push({ ...run });
  }
  const text = merged.map(run => run.text).join('');
  const left = text.length - text.trimStart().length;
  const right = text.length - text.trimEnd().length;
  let offset = 0;
  return merged.flatMap(run => {
    const start = Math.max(0, left - offset);
    const end = Math.min(run.text.length, text.length - right - offset);
    offset += run.text.length;
    return end > start ? [{ ...run, text: run.text.slice(start, end) }] : [];
  });
}

export function passagesFromDocxHtml(html, name = 'Word document') {
  const root = parseFragment(html);
  const blocks = [];
  function visit(node, listType = null) {
    const tag = node.tagName;
    if (tag === 'ul' || tag === 'ol') { for (const child of node.childNodes || []) visit(child, tag === 'ol' ? 'ordered' : 'unordered'); return; }
    if (tag === 'li') {
      const inlineChildren = (node.childNodes || []).filter(child => !['ul', 'ol'].includes(child.tagName));
      const runs = normalizeRuns(inlineChildren.flatMap(child => collectRuns(child)));
      const text = runs.map(run => run.text).join('');
      if (text) blocks.push({ kind: 'list-item', text, runs, listType: listType || 'unordered' });
      for (const child of node.childNodes || []) if (['ul', 'ol'].includes(child.tagName)) visit(child);
      return;
    }
    if (tag === 'p' || /^h[1-6]$/.test(tag || '')) {
      const runs = normalizeRuns(collectRuns(node));
      const text = runs.map(run => run.text).join('');
      if (text) blocks.push({ kind: tag === 'p' ? 'paragraph' : 'heading', text, runs, ...(tag === 'p' ? {} : { level: Number(tag[1]) }) });
      return;
    }
    for (const child of node.childNodes || []) visit(child, listType);
  }
  visit(root);
  return finishPassages(name, blocks);
}

export async function parseDocx(file) {
  if (file.size > MAX_DOCX_BYTES) throw new Error('This DOCX is too large. The limit is 15 MB.');
  let result;
  try {
    result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, {
      convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })),
    });
  } catch { throw new Error('Could not open this DOCX. It may be damaged or password protected.'); }
  if (result.value.length > MAX_HTML_CHARS) throw new Error('This DOCX has too much text to open safely.');
  try { return passagesFromDocxHtml(result.value, file.name); }
  catch { throw new Error('Could not find readable text in this DOCX.'); }
}
