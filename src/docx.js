import mammoth from 'mammoth/mammoth.browser.js';
import { parseFragment } from 'parse5';
import { Unzip, UnzipInflate } from 'fflate';
import { finishPassages, safeHref } from './passages.js';

const MAX_DOCX_BYTES = 15 * 1024 * 1024;
const MAX_HTML_CHARS = 8 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 24 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 2000;

function checkZipExpansion(buffer) {
  const view = new DataView(buffer);
  const length = view.byteLength;
  let end = -1;
  for (let i = length - 22; i >= Math.max(0, length - 22 - 65535); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === length) { end = i; break; }
  }
  if (end < 0) throw new Error('Could not open this DOCX. It may be damaged or password protected.');
  const count = view.getUint16(end + 10, true);
  const size = view.getUint32(end + 12, true);
  const offset = view.getUint32(end + 16, true);
  if (!count || count === 0xffff || count > MAX_ZIP_ENTRIES || size === 0xffffffff || offset === 0xffffffff || offset + size > end) throw new Error('This DOCX is too complex or large to open safely.');
  let cursor = offset, total = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('Could not open this DOCX. It may be damaged or password protected.');
    const flags = view.getUint16(cursor + 8, true);
    const compressed = view.getUint32(cursor + 20, true);
    const expanded = view.getUint32(cursor + 24, true);
    if (flags & 1) throw new Error('Password-protected DOCX files cannot be opened.');
    if (expanded === 0xffffffff || compressed === 0xffffffff || expanded > MAX_UNCOMPRESSED_BYTES || (expanded > 1024 * 1024 && expanded > compressed * 200)) throw new Error('This DOCX is too highly compressed or large to open safely.');
    total += expanded;
    if (total > MAX_UNCOMPRESSED_BYTES) throw new Error('This DOCX has too much content to open safely.');
    cursor += 46 + view.getUint16(cursor + 28, true) + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
  }
  if (cursor !== offset + size) throw new Error('Could not open this DOCX. It may be damaged or password protected.');
}

function checkActualExpansion(buffer) {
  const bytes = new Uint8Array(buffer);
  let total = 0, entries = 0, failure = null;
  const unzip = new Unzip(file => {
    entries++;
    if (entries > MAX_ZIP_ENTRIES) { failure = 'This DOCX has too many parts to open safely.'; return; }
    let expanded = 0;
    file.ondata = (error, chunk) => {
      if (failure) return;
      if (error) { failure = 'Could not open this DOCX. It may be damaged or password protected.'; return; }
      expanded += chunk.length;
      total += chunk.length;
      if (expanded > MAX_UNCOMPRESSED_BYTES || total > MAX_UNCOMPRESSED_BYTES || (expanded > 1024 * 1024 && Number.isFinite(file.size) && expanded > file.size * 200)) failure = 'This DOCX is too highly compressed or large to open safely.';
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  try {
    for (let i = 0; i < bytes.length && !failure; i += 1024) unzip.push(bytes.subarray(i, i + 1024), i + 1024 >= bytes.length);
  } catch { if (!failure) failure = 'Could not open this DOCX. It may be damaged or password protected.'; }
  if (failure) throw new Error(failure);
  if (!entries) throw new Error('Could not open this DOCX. It may be damaged or password protected.');
}

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
  const buffer = await file.arrayBuffer();
  checkZipExpansion(buffer);
  checkActualExpansion(buffer);
  let result;
  try {
    result = await mammoth.convertToHtml({ arrayBuffer: buffer }, {
      convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })),
    });
  } catch { throw new Error('Could not open this DOCX. It may be damaged or password protected.'); }
  if (result.value.length > MAX_HTML_CHARS) throw new Error('This DOCX has too much text to open safely.');
  try { return passagesFromDocxHtml(result.value, file.name); }
  catch { throw new Error('Could not find readable text in this DOCX.'); }
}
