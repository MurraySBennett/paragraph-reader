import MarkdownIt from 'markdown-it';
import { finishPassages, safeHref } from './passages.js';

const parser = new MarkdownIt({ html: false, linkify: false, typographer: false });

export function inlineRuns(tokens) {
  const runs = [];
  let bold = 0, italic = 0, href = null;
  const push = text => {
    if (!text) return;
    const last = runs.at(-1);
    if (last && last.bold === !!bold && last.italic === !!italic && last.href === href) last.text += text;
    else runs.push({ text, bold: !!bold, italic: !!italic, href });
  };
  for (const token of tokens || []) {
    switch (token.type) {
      case 'strong_open': bold++; break;
      case 'strong_close': bold = Math.max(0, bold - 1); break;
      case 'em_open': italic++; break;
      case 'em_close': italic = Math.max(0, italic - 1); break;
      case 'link_open': href = safeHref(token.attrGet('href')); break;
      case 'link_close': href = null; break;
      case 'softbreak': case 'hardbreak': push(' '); break;
      case 'text': case 'code_inline': case 'html_inline': push(token.content); break;
      case 'image': push(token.content || ''); break;
    }
  }
  const text = runs.map(run => run.text).join('');
  const trimLeft = text.length - text.trimStart().length;
  const trimRight = text.length - text.trimEnd().length;
  let offset = 0;
  return runs.flatMap(run => {
    const start = Math.max(0, trimLeft - offset);
    const end = Math.min(run.text.length, text.length - trimRight - offset);
    offset += run.text.length;
    return end > start ? [{ ...run, text: run.text.slice(start, end) }] : [];
  });
}

export function parseMarkdown(text, name = 'Markdown') {
  const tokens = parser.parse(String(text ?? ''), {});
  const blocks = [];
  let kind = 'paragraph', level, listType, inList = null;
  for (const token of tokens) {
    if (token.type === 'heading_open') { kind = 'heading'; level = Number(token.tag.slice(1)); }
    else if (token.type === 'paragraph_open') kind = inList ? 'list-item' : 'paragraph';
    else if (token.type === 'bullet_list_open') inList = 'unordered';
    else if (token.type === 'ordered_list_open') inList = 'ordered';
    else if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') inList = null;
    else if (token.type === 'inline') {
      const runs = inlineRuns(token.children);
      const visible = runs.map(run => run.text).join('');
      if (visible) blocks.push({ kind, text: visible, runs, ...(kind === 'heading' ? { level } : {}), ...(kind === 'list-item' ? { listType: inList || listType || 'unordered' } : {}) });
    }
    else if (token.type === 'fence' || token.type === 'code_block') {
      const visible = token.content.trim();
      if (visible) blocks.push({ kind: 'paragraph', text: visible, runs: [{ text: visible, bold: false, italic: false, href: null }] });
    }
    if (inList) listType = inList;
  }
  return finishPassages(name, blocks);
}
