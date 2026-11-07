import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeWords, normalizeWpm } from '../src/word-mode.js';

test('word mode keeps punctuation with each displayed word', () => {
  assert.deepEqual(tokenizeWords('Wait—really? Yes, please.'), ['Wait—really?', 'Yes,', 'please.']);
});

test('word speed stays in usable range', () => {
  assert.equal(normalizeWpm(10), 100);
  assert.equal(normalizeWpm(2000), 800);
  assert.equal(normalizeWpm(325), 325);
});
