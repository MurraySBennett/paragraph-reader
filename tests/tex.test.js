import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTex } from '../src/tex.js';

test('TeX preserves sections, nested emphasis, list items and safe links', () => {
  const source = String.raw`\documentclass{article}
\begin{document}
\section{Methods}

A \textbf{bold \emph{part}} and \href{https://example.org}{site}.

\begin{itemize}
\item One
\item Two
\end{itemize}
\end{document}`;
  const parsed = parseTex(source, 'demo.tex');
  assert.deepEqual(parsed.blocks.map(block => [block.kind, block.text]), [
    ['heading', 'Methods'], ['paragraph', 'A bold part and site.'], ['list-item', 'One'], ['list-item', 'Two'],
  ]);
  assert.deepEqual(parsed.blocks[1].runs.find(run => run.text === 'part'), { text: 'part', bold: true, italic: true, href: null });
  assert.equal(parsed.blocks[1].runs.find(run => run.text === 'site').href, 'https://example.org/');
});

test('TeX distinguishes subsection headings and numbered items', () => {
  const parsed = parseTex(String.raw`\begin{document}\section{Main}\subsection{Detail}\begin{enumerate}\item First\item Second\end{enumerate}\end{document}`, 'demo.tex');
  assert.deepEqual(parsed.blocks.map(block => [block.kind, block.level ?? block.listType]), [
    ['heading', 2], ['heading', 3], ['list-item', 'ordered'], ['list-item', 'ordered'],
  ]);
});
