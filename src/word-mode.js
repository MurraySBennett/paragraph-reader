export function tokenizeWords(text) { return String(text || '').trim().split(/\s+/u).filter(Boolean); }
export function normalizeWpm(value) { return Math.max(100, Math.min(800, Number(value) || 300)); }

export class WordPlayer {
  constructor({ onWord, onFinish, wpm = 300 }) {
    this.onWord = onWord; this.onFinish = onFinish; this.wpm = normalizeWpm(wpm);
    this.words = []; this.index = 0; this.timer = null; this.paused = false;
  }
  start(text) { this.stop(false); this.words = tokenizeWords(text); this.index = 0; this.paused = false; this.tick(); }
  tick() {
    if (this.paused) return;
    if (this.index >= this.words.length) { this.stop(false); this.onFinish(); return; }
    this.onWord(this.words[this.index], this.index + 1, this.words.length);
    this.index++;
    this.timer = setTimeout(() => this.tick(), 60000 / this.wpm);
  }
  pause() { this.paused = true; clearTimeout(this.timer); }
  resume() { if (!this.paused) return; this.paused = false; this.tick(); }
  setWpm(value) { this.wpm = normalizeWpm(value); if (!this.paused && this.timer) { clearTimeout(this.timer); this.timer = setTimeout(() => this.tick(), 60000 / this.wpm); } }
  stop(finish = false) { clearTimeout(this.timer); this.timer = null; this.paused = true; if (finish) this.onFinish(); }
}
