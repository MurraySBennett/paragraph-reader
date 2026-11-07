import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeWords, normalizeWpm, makeWordSegments, WordPlayer } from '../src/word-mode.js';

test('word mode keeps punctuation with each displayed word', () => {
  assert.deepEqual(tokenizeWords('Wait—really? Yes, please.'), ['Wait—really?', 'Yes,', 'please.']);
});

test('word speed stays in usable range', () => {
  assert.equal(normalizeWpm(10), 100);
  assert.equal(normalizeWpm(2000), 800);
  assert.equal(normalizeWpm(325), 325);
});

test('sentence and paragraph segments preserve their boundaries', () => {
  assert.deepEqual(makeWordSegments('One. Two!\n\nThree?', 'sentence'), ['One.', 'Two!', 'Three?']);
  assert.deepEqual(makeWordSegments('One. Two!\n\nThree?', 'paragraph'), ['One. Two!', 'Three?']);
  assert.deepEqual(makeWordSegments(' \n\n ', 'paragraph'), []);
});

test('player opens ready, pauses and waits at each segment boundary', async () => {
  const words = [], states = [];
  const player = new WordPlayer({ wpm: 800, onWord: word => words.push(word), onState: state => states.push(state) });
  player.load(['One two', 'Three']);
  assert.equal(player.state, 'ready');
  assert.deepEqual(words, []);
  assert.equal(player.next(), false);
  player.start();
  assert.deepEqual(words, ['One']);
  player.pause();
  assert.equal(player.state, 'paused');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.deepEqual(words, ['One']);
  player.resume();
  await new Promise(resolve => setTimeout(resolve, 180));
  assert.equal(player.state, 'waiting');
  assert.deepEqual(words, ['One', 'two']);
  assert.equal(player.next(), true);
  assert.deepEqual(words, ['One', 'two', 'Three']);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(player.state, 'finished');
  assert.equal(player.next(), false);
  assert.ok(states.includes('waiting'));
});

test('stopping cancels playback and loading a new queue resets position', async () => {
  const words = [];
  const player = new WordPlayer({ wpm: 800, onWord: word => words.push(word) });
  player.load(['Old words']); player.start(); player.stop();
  player.load(['New words']);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.deepEqual(words, ['Old']);
  assert.equal(player.state, 'ready');
  player.start();
  assert.deepEqual(words, ['Old', 'New']);
  player.stop();
});

test('word callback sees the displayed word as current progress', () => {
  let seen;
  const player = new WordPlayer({ onWord: (_word, index) => { seen = [index, player.index]; } });
  player.load(['One two']); player.start();
  assert.deepEqual(seen, [1, 1]);
  player.stop();
});
