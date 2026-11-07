export function prepareText(value, name = '') {
  let text = String(value ?? '').replace(/\r\n?/g, '\n');
  if (!/\.(tex|ltx)$/i.test(name) && !/\\(?:documentclass|begin\{document\})/.test(text.slice(0, 4000))) return text;
  text = text.replace(/(^|[^\\])%.*$/gm, '$1');
  const begin = text.indexOf('\\begin{document}');
  const end = text.indexOf('\\end{document}');
  if (begin >= 0) text = text.slice(begin + 16, end < 0 ? undefined : end);
  text = text.replace(/\\(?:part|chapter|section|subsection|subsubsection|paragraph)\*?\{([^{}]*)\}/g, '\n\n$1\n\n');
  text = text.replace(/\\item\b(?:\[[^\]]*\])?/g, '\n\n');
  for (let i = 0; i < 8; i++) text = text.replace(/\\(?:emph|textbf|textit|textrm|textsf|texttt|textsc|underline|text|mbox|hbox)\*?\{([^{}]*)\}/g, '$1');
  text = text.replace(/\\(?:begin|end)\{[^{}]*\}/g, '\n\n');
  text = text.replace(/\\(?:cite\w*|ref|eqref|label|includegraphics|footnote|url|href|bibliography)\*?(?:\[[^\]]*\])?(?:\{[^{}]*\})*/g, ' ');
  text = text.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\{([^{}]*)\}/g, '$1');
  text = text.replace(/\\[a-zA-Z]+\*?/g, ' ').replace(/\\([$&%#_{}])/g, '$1');
  text = text.replace(/[{}]/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function splitParagraphs(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ')
    .split(/\n\s*\n+/)
    .map(block => block.split('\n').map(line => line.trim()).join(' ').replace(/[ \t]{2,}/g, ' ').trim())
    .filter(Boolean);
}

export function makeChunks(paragraphs, unit = 'paragraph', pageWords = 250) {
  if (unit === 'sentence') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
    return paragraphs.flatMap((paragraph, i) => [...segmenter.segment(paragraph)]
      .map(item => item.segment.trim()).filter(Boolean).map(text => ({ text, start: i, end: i })));
  }
  if (unit === 'page') {
    const target = Math.max(1, Number(pageWords) || 250);
    const chunks = [];
    let group = [], start = 0, count = 0;
    function flush(end) {
      if (group.length) chunks.push({ text: group.join('\n\n'), start, end });
      group = []; count = 0;
    }
    paragraphs.forEach((paragraph, i) => {
      const words = paragraph.trim().split(/\s+/).length;
      if (group.length && count + words > target) flush(i - 1);
      if (!group.length) start = i;
      group.push(paragraph); count += words;
    });
    flush(paragraphs.length - 1);
    return chunks;
  }
  return paragraphs.map((text, i) => ({ text, start: i, end: i }));
}
