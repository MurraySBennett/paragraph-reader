import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlain, makeStructuredChunks, validatePassages } from '../src/passages.js';

test('plain passages preserve paragraph anchors and sentence boundaries', () => {
  const parsed = parsePlain('First sentence. Second sentence!\n\nAnother paragraph?', 'note.txt');
  assert.equal(parsed.text, 'First sentence. Second sentence!\n\nAnother paragraph?');
  assert.deepEqual(parsed.blocks.map(block => [block.kind, block.anchor, block.text]), [
    ['paragraph', 0, 'First sentence. Second sentence!'],
    ['paragraph', 1, 'Another paragraph?'],
  ]);
  const chunks = makeStructuredChunks(parsed.blocks, 'sentence');
  assert.deepEqual(chunks.map(chunk => [chunk.text, chunk.start, chunk.end]), [
    ['First sentence.', 0, 0], ['Second sentence!', 0, 0], ['Another paragraph?', 1, 1],
  ]);
});

test('structured sentence cuts keep marks attached to their words', () => {
  const blocks = [{ kind: 'paragraph', anchor: 0, text: 'One. Two!', runs: [
    { text: 'One. ', bold: true, italic: false, href: null },
    { text: 'Two!', bold: false, italic: true, href: null },
  ] }];
  const chunks = makeStructuredChunks(blocks, 'sentence');
  assert.deepEqual(chunks.map(chunk => chunk.blocks[0].runs), [
    [{ text: 'One.', bold: true, italic: false, href: null }],
    [{ text: 'Two!', bold: false, italic: true, href: null }],
  ]);
});

test('passage validation rejects unsafe link schemes and mismatched visible text', () => {
  const block = { kind: 'paragraph', anchor: 0, text: 'open', runs: [{ text: 'open', bold: false, italic: false, href: 'javascript:alert(1)' }] };
  assert.equal(validatePassages([block]), false);
  assert.equal(validatePassages([{ ...block, runs: [{ ...block.runs[0], href: 'https://example.org' }] }]), true);
  assert.equal(validatePassages([{ ...block, text: 'other', runs: [{ ...block.runs[0], href: null }] }]), false);
});
