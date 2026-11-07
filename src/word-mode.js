export function tokenizeWords(text) { return String(text || '').trim().split(/\s+/u).filter(Boolean); }
export function normalizeWpm(value) { return Math.max(100, Math.min(800, Number(value) || 300)); }

export function makeWordSegments(text, unit = 'sentence') {
  const paragraphs = String(text || '').replace(/\r\n?/g, '\n').split(/\n\s*\n+/u).map(value => value.trim()).filter(Boolean);
  if (unit === 'paragraph') return paragraphs;
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
  return paragraphs.flatMap(paragraph => [...segmenter.segment(paragraph)].map(item => item.segment.trim()).filter(Boolean));
}

export class WordPlayer {
  constructor({ onWord = () => {}, onState = () => {}, wpm = 300 }) {
    this.onWord = onWord; this.onState = onState; this.wpm = normalizeWpm(wpm);
    this.segments = []; this.segmentIndex = 0; this.words = []; this.index = 0; this.timer = null; this.state = 'finished';
  }
  get paused() { return this.state !== 'playing'; }
  setState(value) { this.state = value; this.onState(value); }
  load(segments) {
    this.stop();
    this.segments = segments.map(text => String(text).trim()).filter(Boolean);
    this.segmentIndex = 0; this.index = 0;
    this.words = tokenizeWords(this.segments[0]);
    this.setState(this.words.length ? 'ready' : 'finished');
  }
  start() { if (this.state !== 'ready') return false; this.setState('playing'); this.tick(); return true; }
  tick() {
    if (this.state !== 'playing') return;
    if (this.index >= this.words.length) {
      this.timer = null;
      this.setState(this.segmentIndex < this.segments.length - 1 ? 'waiting' : 'finished');
      return;
    }
    const word = this.words[this.index++];
    this.onWord(word, this.index, this.words.length, this.segmentIndex + 1, this.segments.length);
    this.timer = setTimeout(() => this.tick(), 60000 / this.wpm);
  }
  pause() { if (this.state !== 'playing') return; clearTimeout(this.timer); this.timer = null; this.setState('paused'); }
  resume() { if (this.state !== 'paused') return false; this.setState('playing'); this.tick(); return true; }
  next() {
    if (this.state !== 'waiting') return false;
    this.segmentIndex++;
    this.words = tokenizeWords(this.segments[this.segmentIndex]); this.index = 0;
    this.setState('playing'); this.tick(); return true;
  }
  setWpm(value) {
    this.wpm = normalizeWpm(value);
    if (this.state === 'playing' && this.timer) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.tick(), 60000 / this.wpm);
    }
  }
  stop() { clearTimeout(this.timer); this.timer = null; this.setState('finished'); }
}
