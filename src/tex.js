import { finishPassages, safeHref } from './passages.js';

function group(source, index) {
  if (source[index] !== '{') return null;
  let depth = 1;
  for (let i = index + 1; i < source.length; i++) {
    if (source[i] === '{' && source[i - 1] !== '\\') depth++;
    if (source[i] === '}' && source[i - 1] !== '\\' && --depth === 0) return { value: source.slice(index + 1, i), end: i + 1 };
  }
  return null;
}

function texRuns(source, style = { bold: false, italic: false, href: null }) {
  const runs = [];
  const push = (text, current = style) => {
    if (!text) return;
    const last = runs.at(-1);
    if (last && last.bold === current.bold && last.italic === current.italic && last.href === current.href) last.text += text;
    else runs.push({ text, ...current });
  };
  for (let i = 0; i < source.length;) {
    if (source[i] !== '\\') { push(source[i]); i++; continue; }
    const command = /^\\([A-Za-z]+)\*?/.exec(source.slice(i));
    if (!command) { push(source[i + 1] || ''); i += 2; continue; }
    i += command[0].length;
    const name = command[1];
    if (source[i] === ' ') i++;
    const first = group(source, i);
    if (!first) { if (['par', 'newline', 'linebreak'].includes(name)) push(' '); continue; }
    i = first.end;
    if (name === 'href') {
      const label = group(source, i);
      if (label) { i = label.end; for (const run of texRuns(label.value, { ...style, href: safeHref(first.value) })) push(run.text, run); }
      continue;
    }
    if (name === 'url') { push(first.value, { ...style, href: safeHref(first.value) }); continue; }
    if (['label', 'ref', 'eqref', 'cite', 'citep', 'includegraphics', 'footnote', 'input', 'bibliography'].includes(name)) continue;
    const next = { ...style, bold: style.bold || name === 'textbf', italic: style.italic || ['textit', 'emph'].includes(name) };
    for (const run of texRuns(first.value, next)) push(run.text, run);
  }
  return trimRuns(runs);
}

function trimRuns(runs) {
  const text = runs.map(run => run.text).join('');
  const left = text.length - text.trimStart().length;
  const right = text.length - text.trimEnd().length;
  let offset = 0;
  return runs.flatMap(run => {
    const start = Math.max(0, left - offset);
    const end = Math.min(run.text.length, text.length - right - offset);
    offset += run.text.length;
    return end > start ? [{ ...run, text: run.text.slice(start, end) }] : [];
  });
}

export function parseTex(value, name = 'TeX') {
  let source = String(value ?? '').replace(/\r\n?/g, '\n').replace(/(^|[^\\])%.*$/gm, '$1');
  const begin = source.indexOf('\\begin{document}');
  if (begin >= 0) source = source.slice(begin + '\\begin{document}'.length);
  const end = source.indexOf('\\end{document}');
  if (end >= 0) source = source.slice(0, end);
  source = source.replace(/\\(part|chapter|section|subsection|subsubsection)\*?\{([^{}]*)\}/g, (_match, command, title) => {
    const level = { part: 1, chapter: 1, section: 2, subsection: 3, subsubsection: 4 }[command];
    return `\n\n@@HEADING:${level}@@${title}\n\n`;
  });
  source = source.replace(/\\begin\{(itemize|enumerate)\}/g, (_match, list) => `\n\n@@LIST:${list}@@\n\n`);
  source = source.replace(/\\end\{(?:itemize|enumerate)\}/g, '\n\n@@ENDLIST@@\n\n');
  source = source.replace(/\\item\b(?:\[[^\]]*\])?/g, '\n\n@@ITEM@@');
  source = source.replace(/\\(?:begin|end)\{[^{}]*\}/g, '\n\n');
  const blocks = [];
  let listType = 'unordered';
  for (const part of source.split(/\n\s*\n+/)) {
    let raw = part.trim();
    if (!raw) continue;
    if (raw.startsWith('@@LIST:')) { listType = raw.includes('enumerate') ? 'ordered' : 'unordered'; continue; }
    if (raw.startsWith('@@ENDLIST@@')) continue;
    const heading = /^@@HEADING:\d@@/.test(raw);
    const item = raw.startsWith('@@ITEM@@');
    const level = heading ? Number(raw[10]) : null;
    if (heading) raw = raw.slice('@@HEADING:2@@'.length);
    if (item) raw = raw.slice('@@ITEM@@'.length);
    raw = raw.replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ');
    const runs = texRuns(raw);
    const text = runs.map(run => run.text).join('');
    if (text) blocks.push({ kind: heading ? 'heading' : item ? 'list-item' : 'paragraph', text, runs, ...(heading ? { level } : {}), ...(item ? { listType } : {}) });
  }
  return finishPassages(name, blocks);
}
