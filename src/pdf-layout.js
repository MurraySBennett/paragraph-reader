// Journal manuscripts arrive double-spaced with a line number on every row, so the
// extracted rows never contain a blank line and the whole body reads as one paragraph.
// Paragraphs are recovered from the first-line indent instead.

const BARE_NUMBER = /^\s*\d{1,3}\s*$/;
const GUTTER = /^\s*\d{1,3}(?=\s{2})/;
const INDENT_STEP = 4;
const HEADING_CHARS = 70;

// Numbering shows up as rows holding nothing but a counter that climbs down the page.
// Requiring the climb keeps table columns of bare figures from being read as a gutter.
export function looksLineNumbered(rows) {
  const bare = rows.filter(row => BARE_NUMBER.test(row)).map(row => Number(row.trim()));
  if (rows.length < 8 || bare.length / rows.length < 0.2) return false;
  return bare.slice(1).filter((value, index) => value > bare[index]).length >= (bare.length - 1) * 0.6;
}

function headKey(text) {
  return text.trim().replace(/\s+\d{1,4}$/, '').toUpperCase();
}

function runningHeads(pages) {
  const counts = new Map();
  for (const rows of pages) {
    const first = rows.find(row => row.trim());
    if (first === undefined) continue;
    const key = headKey(first);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  const threshold = Math.max(2, Math.ceil(pages.length / 2));
  return new Set([...counts].filter(([, count]) => count >= threshold).map(([key]) => key));
}

// A heading is short, opens in capitals, and carries no sentence punctuation of its own.
function isHeading(text) {
  return text.length <= HEADING_CHARS && /^[A-Z0-9]/.test(text) && !/[.,;:!?-]$/.test(text);
}

function modalIndent(indents) {
  const counts = new Map();
  for (const indent of indents) counts.set(indent, (counts.get(indent) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

export function layoutParagraphs(pages) {
  const numbered = looksLineNumbered(pages.flat());
  const stripped = pages.map(rows => rows
    .filter(row => !(numbered && BARE_NUMBER.test(row)))
    .map(row => (numbered ? row.replace(GUTTER, '') : row)));
  const heads = runningHeads(stripped);

  const paragraphs = [];
  let current = [];
  const flush = () => {
    if (!current.length) return;
    const text = current.reduce((joined, row) => (joined.endsWith('-') ? joined + row : `${joined} ${row}`));
    paragraphs.push(text.replace(/\s{2,}/g, ' ').trim());
    current = [];
  };

  for (const page of stripped) {
    // A running head is removed outright: a blank row ends a paragraph, a dropped head does not.
    const rows = page.filter(row => !(row.trim() && heads.has(headKey(row))));
    const kept = rows.map(row => (row.trim()
      ? { indent: row.length - row.trimStart().length, text: row.trim() }
      : null));
    const bodies = kept.filter(Boolean);
    if (!bodies.length) { flush(); continue; }
    const modal = modalIndent(bodies.map(row => row.indent));
    for (const row of kept) {
      if (!row) { flush(); continue; }
      if (row.indent >= modal + INDENT_STEP) flush();
      else if (current.length && isHeading(row.text) && /[.!?:]$/.test(current.at(-1))) flush();
      current.push(row.text);
    }
  }
  flush();
  return paragraphs.filter(Boolean);
}

// PDF.js gives positions in points; convert them to the character columns the rules above use.
export function rowsFromItems(items) {
  const placed = items
    .filter(item => (item.str || '').trim())
    .map(item => ({ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }));
  if (!placed.length) return [];
  const widths = placed.map(item => item.width / item.text.length).filter(width => width > 0).sort((a, b) => a - b);
  const charWidth = widths[Math.floor(widths.length / 2)] || 1;
  const left = Math.min(...placed.map(item => item.x));

  const lines = [];
  for (const item of placed.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.at(-1);
    if (line && Math.abs(line.y - item.y) <= 2) line.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }
  return lines.map(line => {
    const sorted = line.items.sort((a, b) => a.x - b.x);
    const indent = Math.round((sorted[0].x - left) / charWidth);
    return ' '.repeat(Math.max(0, indent)) + sorted.map(item => item.text).join(' ').replace(/\s{2,}/g, ' ').trim();
  });
}
