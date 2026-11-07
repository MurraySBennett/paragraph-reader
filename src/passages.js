import { splitParagraphs } from './content.js';

export function safeHref(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function finishPassages(name, blocks) {
  const normalized = blocks.filter(block => block.text.trim()).map((block, anchor) => ({ ...block, anchor }));
  if (!validatePassages(normalized)) throw new Error('Could not read document structure.');
  return { name, text: normalized.map(block => block.text).join('\n\n'), blocks: normalized };
}

export function parsePlain(text, name = 'Pasted text') {
  return finishPassages(name, splitParagraphs(text).map(value => ({
    kind: 'paragraph', text: value, runs: [{ text: value, bold: false, italic: false, href: null }],
  })));
}

export function validatePassages(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) return false;
  return blocks.every((block, index) => {
    if (!block || !['paragraph', 'heading', 'list-item'].includes(block.kind) || block.anchor !== index || typeof block.text !== 'string' || !block.text || !Array.isArray(block.runs) || !block.runs.length) return false;
    if (block.kind === 'heading' && (!Number.isInteger(block.level) || block.level < 1 || block.level > 6)) return false;
    if (block.kind === 'list-item' && !['ordered', 'unordered'].includes(block.listType)) return false;
    return block.runs.every(run => typeof run?.text === 'string' && run.text.length > 0 && typeof run.bold === 'boolean' && typeof run.italic === 'boolean' && (run.href === null || (typeof run.href === 'string' && safeHref(run.href) !== null))) && block.runs.map(run => run.text).join('') === block.text;
  });
}

function sliceRuns(runs, start, end) {
  let offset = 0;
  const sliced = [];
  for (const run of runs) {
    const from = Math.max(0, start - offset);
    const to = Math.min(run.text.length, end - offset);
    if (to > from) sliced.push({ ...run, text: run.text.slice(from, to) });
    offset += run.text.length;
  }
  return sliced;
}

export function makeStructuredChunks(blocks, unit = 'paragraph', pageWords = 250) {
  if (!validatePassages(blocks)) throw new Error('Invalid document structure.');
  if (unit === 'sentence') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
    return blocks.flatMap(block => [...segmenter.segment(block.text)].flatMap(item => {
      const left = item.segment.length - item.segment.trimStart().length;
      const right = item.segment.trimEnd().length;
      if (right <= left) return [];
      const start = item.index + left;
      const end = item.index + right;
      const text = block.text.slice(start, end);
      return [{ text, start: block.anchor, end: block.anchor, blocks: [{ ...block, text, runs: sliceRuns(block.runs, start, end) }] }];
    }));
  }
  if (unit === 'page') {
    const target = Math.max(1, Number(pageWords) || 250);
    const chunks = [];
    let group = [], count = 0;
    const flush = () => {
      if (group.length) chunks.push({ text: group.map(block => block.text).join('\n\n'), start: group[0].anchor, end: group.at(-1).anchor, blocks: group });
      group = []; count = 0;
    };
    for (const block of blocks) {
      const words = block.text.trim().split(/\s+/).length;
      if (group.length && count + words > target) flush();
      group.push(block); count += words;
    }
    flush();
    return chunks;
  }
  return blocks.map(block => ({ text: block.text, start: block.anchor, end: block.anchor, blocks: [block] }));
}
