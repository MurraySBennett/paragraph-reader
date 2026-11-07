import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareText, splitParagraphs, makeChunks } from '../src/content.js';

test('paragraph and sentence chunks retain source paragraph anchors', () => {
  const paragraphs = splitParagraphs('First sentence. Second sentence!\n\nAnother paragraph? Yes.');
  assert.deepEqual(paragraphs, ['First sentence. Second sentence!', 'Another paragraph? Yes.']);
  assert.deepEqual(makeChunks(paragraphs, 'sentence').map(x => [x.text, x.start, x.end]), [
    ['First sentence.', 0, 0], ['Second sentence!', 0, 0],
    ['Another paragraph?', 1, 1], ['Yes.', 1, 1]
  ]);
});

test('page chunks group whole paragraphs by word target', () => {
  const chunks = makeChunks(['one two three', 'four five', 'six seven eight'], 'page', 5);
  assert.deepEqual(chunks.map(x => [x.text, x.start, x.end]), [
    ['one two three\n\nfour five', 0, 1], ['six seven eight', 2, 2]
  ]);
});

test('TeX preparation preserves prose without preamble', () => {
  const text = '\\documentclass{article}\n\\begin{document}\n\\section{Hello}\n\nA \\textit{small} test.\\end{document}';
  assert.deepEqual(splitParagraphs(prepareText(text, 'draft.tex')), ['Hello', 'A small test.']);
});
