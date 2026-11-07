import { prepareText, splitParagraphs, makeChunks } from './content.js';
import { createDocument, fingerprint, loadDocument, saveDocument, parseBackup } from './storage.js';
import { WordPlayer } from './word-mode.js';
import { readPdf } from './pdf.js';

const $ = id => document.getElementById(id);
const setup = $('setup'), shell = $('reader-shell'), card = $('paragraph'), note = $('note');
let doc = null, paragraphs = [], paragraphHashes = [], chunks = [], chunkIndex = 0, saveTimer = 0, toastTimer = 0;
const PREF_KEY = 'paragraph-reader:preferences:v2';
const defaults = { unit: 'paragraph', notes: true, theme: 'system', fontSize: 20, lineHeight: 1.7, textWidth: 64, pageWords: 250, notesWidth: 34, editorHeight: 240, customBg: '#f8f5ef', customText: '#202327', customAccent: '#345f68' };
let prefs = { ...defaults };
try { prefs = { ...defaults, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch {}

function status(message, error = false) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  el.dataset.error = String(error);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { status('Settings could not be saved in this browser.', true); } }

function applyPrefs() {
  document.body.dataset.theme = prefs.theme;
  document.documentElement.style.setProperty('--font-size', `${prefs.fontSize}px`);
  document.documentElement.style.setProperty('--line-height', String(prefs.lineHeight));
  document.documentElement.style.setProperty('--text-width', `${prefs.textWidth}ch`);
  document.documentElement.style.setProperty('--notes-width', `${prefs.notesWidth}%`);
  document.documentElement.style.setProperty('--editor-height', `${prefs.editorHeight}px`);
  for (const [id, value] of [['unit', prefs.unit], ['theme', prefs.theme], ['font-size', prefs.fontSize], ['line-height', prefs.lineHeight], ['text-width', prefs.textWidth], ['page-words', prefs.pageWords], ['custom-bg', prefs.customBg], ['custom-text', prefs.customText], ['custom-accent', prefs.customAccent]]) $(id).value = value;
  $('font-size-value').textContent = `${prefs.fontSize} px`;
  $('line-height-value').textContent = String(prefs.lineHeight);
  $('text-width-value').textContent = `${prefs.textWidth} ch`;
  $('custom-colors').hidden = prefs.theme !== 'custom';
  for (const [prop, value] of [['--bg', prefs.customBg], ['--surface', prefs.customBg], ['--panel', prefs.customBg], ['--fg', prefs.customText], ['--accent', prefs.customAccent]]) document.body.style.setProperty(prop, prefs.theme === 'custom' ? value : '');
  document.body.style.setProperty('--accent-text', prefs.theme === 'custom' ? '#fff' : '');
  setNotesVisible(prefs.notes, false);
  $('pane-resizer').setAttribute('aria-valuenow', String(prefs.notesWidth));
  $('note-resizer').setAttribute('aria-valuenow', String(prefs.editorHeight));
}

function setNotesVisible(visible, save = true) {
  prefs.notes = Boolean(visible);
  $('note-pane').hidden = !prefs.notes;
  $('pane-resizer').hidden = !prefs.notes;
  $('app').classList.toggle('notes-hidden', !prefs.notes);
  $('notes-toggle').textContent = prefs.notes ? 'Hide notes' : 'Show notes';
  $('notes-toggle').setAttribute('aria-pressed', String(prefs.notes));
  if (save) savePrefs();
}

function saveDocSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveDoc, 180); }
function saveDoc() {
  if (!doc) return;
  doc.updated = new Date().toISOString();
  try { saveDocument(localStorage, doc); } catch { status('Could not save this document. Download a backup.', true); }
}

function renderNotes() {
  const current = chunks[chunkIndex]?.start ?? 0;
  note.value = doc.notes[current]?.text || '';
  $('note-title').textContent = `Paragraph ${current + 1}`;
  const list = $('note-index');
  list.replaceChildren();
  const entries = Object.entries(doc.notes).filter(([, value]) => value?.text?.trim());
  $('note-count').textContent = String(entries.length);
  for (const [key, value] of entries.sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `¶ ${Number(key) + 1} · ${value.text.slice(0, 100)}`;
    button.addEventListener('click', () => {
      const found = chunks.findIndex(chunk => chunk.start <= Number(key) && chunk.end >= Number(key));
      chunkIndex = Math.max(0, found); render(); note.focus();
    });
    list.append(button);
  }
}

function render() {
  if (!doc || !chunks.length) return;
  chunkIndex = Math.max(0, Math.min(chunks.length - 1, chunkIndex));
  const chunk = chunks[chunkIndex];
  doc.index = chunk.start;
  $('document-name').textContent = doc.name;
  $('progress').textContent = `${chunkIndex + 1} of ${chunks.length} ${prefs.unit}${chunks.length === 1 ? '' : 's'}`;
  $('chunk-label').textContent = `${prefs.unit} ${chunkIndex + 1}`;
  $('chunk-text').textContent = chunk.text;
  $('previous').disabled = chunkIndex === 0;
  $('next').disabled = chunkIndex === chunks.length - 1;
  renderNotes(); saveDocSoon();
}

function setUnit(unit) {
  const current = chunks[chunkIndex]?.start ?? doc?.index ?? 0;
  prefs.unit = ['paragraph', 'sentence', 'page'].includes(unit) ? unit : 'paragraph';
  chunks = makeChunks(paragraphs, prefs.unit, prefs.pageWords);
  chunkIndex = Math.max(0, chunks.findIndex(chunk => chunk.start <= current && chunk.end >= current));
  savePrefs(); render();
}

async function openDocument(text, name = 'Pasted text') {
  const prepared = prepareText(text, name);
  try {
    const nextDoc = await createDocument(name, prepared);
    const saved = loadDocument(localStorage, nextDoc.id);
    doc = saved && saved.text === nextDoc.text ? saved : nextDoc;
    paragraphs = splitParagraphs(doc.text);
    paragraphHashes = await Promise.all(paragraphs.map(fingerprint));
    // Drop notes whose source text changed in a malformed or old saved record.
    for (const [key, value] of Object.entries(doc.notes)) if (paragraphHashes[Number(key)] !== value?.source) delete doc.notes[key];
    setup.hidden = true; shell.hidden = false;
    chunks = makeChunks(paragraphs, prefs.unit, prefs.pageWords);
    chunkIndex = Math.max(0, chunks.findIndex(chunk => chunk.start <= doc.index && chunk.end >= doc.index));
    render(); card.focus();
  } catch (error) { $('setup-status').textContent = error.message || 'Could not read this document.'; }
}

function move(delta) { if (!doc) return; const target = Math.max(0, Math.min(chunks.length - 1, chunkIndex + delta)); if (target !== chunkIndex) { chunkIndex = target; render(); } }

$('start').addEventListener('click', () => openDocument($('input').value));
$('input').addEventListener('keydown', event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) openDocument($('input').value); });
$('file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    $('setup-status').textContent = 'Opening file…';
    const text = /\.pdf$/i.test(file.name) || file.type === 'application/pdf' ? await readPdf(file) : await file.text();
    await openDocument(text, file.name);
    $('setup-status').textContent = '';
  } catch (error) { $('setup-status').textContent = error.message || 'Could not open that file.'; }
  event.target.value = '';
});
$('previous').addEventListener('click', () => move(-1));
$('next').addEventListener('click', () => move(1));
$('read-focus').addEventListener('click', () => card.focus());
$('notes-toggle').addEventListener('click', () => setNotesVisible(!prefs.notes));
$('unit').addEventListener('change', event => setUnit(event.target.value));
note.addEventListener('input', () => {
  const i = chunks[chunkIndex].start;
  if (note.value.trim()) doc.notes[i] = { text: note.value, source: paragraphHashes[i] };
  else delete doc.notes[i];
  renderNoteIndexWithoutInput(); saveDocSoon();
});
function renderNoteIndexWithoutInput() { const start = note.selectionStart, end = note.selectionEnd; renderNotes(); note.focus(); note.setSelectionRange(start, end); }

$('appearance-open').addEventListener('click', () => $('appearance').showModal());
$('appearance-close').addEventListener('click', () => $('appearance').close());
for (const [id, key, cast] of [['theme', 'theme', String], ['font-size', 'fontSize', Number], ['line-height', 'lineHeight', Number], ['text-width', 'textWidth', Number], ['page-words', 'pageWords', Number], ['custom-bg', 'customBg', String], ['custom-text', 'customText', String], ['custom-accent', 'customAccent', String]]) {
  $(id).addEventListener('input', event => { prefs[key] = cast(event.target.value); applyPrefs(); savePrefs(); if (id === 'page-words' && doc && prefs.unit === 'page') setUnit('page'); });
}
$('utilities-open').addEventListener('click', () => { const open = $('utilities').hidden; $('utilities').hidden = !open; $('utilities-open').setAttribute('aria-expanded', String(open)); });
$('new-document').addEventListener('click', () => { saveDoc(); shell.hidden = true; setup.hidden = false; $('utilities').hidden = true; $('input').focus(); });
$('shortcut-help').addEventListener('click', () => { $('utilities').hidden = true; $('shortcuts').showModal(); });
$('shortcuts-close').addEventListener('click', () => $('shortcuts').close());

function download(name, text, type) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    status(`${name} downloaded`);
  } catch { status('Download failed. Please try again.', true); }
}
function safeName() { return (doc?.name || 'reading').replace(/[^a-z0-9._-]+/gi, '_'); }
$('export-backup').addEventListener('click', () => { if (!doc) return; saveDoc(); download(`${safeName()}.reader.json`, JSON.stringify({ version: 2, document: doc, preferences: prefs }, null, 2), 'application/json'); });
$('export-notes').addEventListener('click', () => {
  if (!doc) return;
  const lines = [`# Notes: ${doc.name}`, '', `Bookmark: paragraph ${doc.index + 1} of ${paragraphs.length}`, ''];
  for (const [key, value] of Object.entries(doc.notes).sort((a,b) => Number(a[0]) - Number(b[0]))) {
    if (!value?.text?.trim()) continue;
    lines.push(`## Paragraph ${Number(key) + 1}`, '', `> ${paragraphs[Number(key)]}`, '', value.text.trim(), '');
  }
  if (lines.length === 4) lines.push('_No notes yet._');
  download(`${safeName()}.notes.md`, lines.join('\n'), 'text/markdown;charset=utf-8');
});
$('import-backup').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    const restored = await parseBackup(await file.text());
    await openDocument(restored.document.text, restored.document.name);
    doc = restored.document;
    prefs = { ...defaults, ...restored.preferences };
    applyPrefs(); savePrefs();
    paragraphs = splitParagraphs(doc.text);
    paragraphHashes = await Promise.all(paragraphs.map(fingerprint));
    chunks = makeChunks(paragraphs, prefs.unit, prefs.pageWords);
    chunkIndex = Math.max(0, chunks.findIndex(chunk => chunk.start <= doc.index && chunk.end >= doc.index));
    render(); saveDoc(); $('utilities').hidden = true; status('Backup restored');
  } catch (error) { status(error.message || 'Could not restore backup.', true); }
  event.target.value = '';
});

const player = new WordPlayer({
  onWord: (word, index, total) => { $('word-display').textContent = word; $('word-progress').textContent = `${index} / ${total}`; },
  onFinish: finishWordMode,
});
function finishWordMode() {
  player.stop(false);
  $('word-mode').hidden = true;
  $('word-play').textContent = 'Pause';
  card.focus();
}
$('word-start').addEventListener('click', () => {
  if (!doc) return;
  const selected = getSelection()?.toString().trim();
  const text = selected && card.contains(getSelection()?.anchorNode) ? selected : chunks[chunkIndex].text;
  if (!text) return;
  $('word-mode').hidden = false;
  $('word-display').textContent = '';
  $('word-play').textContent = 'Pause';
  $('word-exit').focus();
  player.setWpm($('word-speed').value);
  player.start(text);
});
$('word-exit').addEventListener('click', finishWordMode);
$('word-play').addEventListener('click', () => {
  if (player.paused) { player.resume(); $('word-play').textContent = 'Pause'; }
  else { player.pause(); $('word-play').textContent = 'Play'; }
});
$('word-speed').addEventListener('input', event => { player.setWpm(event.target.value); $('word-speed-value').textContent = `${player.wpm} WPM`; });
$('word-mode').addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); finishWordMode(); } });

function setNotesWidth(value) { prefs.notesWidth = Math.max(20, Math.min(65, value)); document.documentElement.style.setProperty('--notes-width', `${prefs.notesWidth}%`); $('pane-resizer').setAttribute('aria-valuenow', String(prefs.notesWidth)); savePrefs(); }
function setEditorHeight(value) { prefs.editorHeight = Math.max(120, Math.min(600, value)); document.documentElement.style.setProperty('--editor-height', `${prefs.editorHeight}px`); $('note-resizer').setAttribute('aria-valuenow', String(prefs.editorHeight)); savePrefs(); }
function wireResizer(el, horizontal) {
  el.addEventListener('pointerdown', event => { el.setPointerCapture(event.pointerId); event.preventDefault(); });
  el.addEventListener('pointermove', event => {
    if (!el.hasPointerCapture(event.pointerId)) return;
    if (horizontal) setNotesWidth(Math.round((window.innerWidth - event.clientX) / window.innerWidth * 100));
    else setEditorHeight(Math.round(event.clientY - $('note').getBoundingClientRect().top));
  });
  el.addEventListener('keydown', event => {
    if (horizontal && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); setNotesWidth(prefs.notesWidth + (event.key === 'ArrowLeft' ? 2 : -2)); }
    if (!horizontal && ['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); setEditorHeight(prefs.editorHeight + (event.key === 'ArrowDown' ? 20 : -20)); }
    if (event.key === 'Home') { event.preventDefault(); horizontal ? setNotesWidth(34) : setEditorHeight(240); }
  });
}
wireResizer($('pane-resizer'), true); wireResizer($('note-resizer'), false);
$('reset-layout').addEventListener('click', () => { setNotesWidth(34); setEditorHeight(240); });

document.addEventListener('keydown', event => {
  if (shell.hidden || !($('word-mode').hidden) || $('appearance').open || $('shortcuts').open) return;
  if (event.key === 'Escape' && document.activeElement === note) { event.preventDefault(); card.focus(); return; }
  const target = event.target;
  if (target instanceof HTMLElement && (target.matches('input, textarea, select, button') || target.isContentEditable)) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key.toLowerCase() === 'n' && prefs.notes) { event.preventDefault(); note.focus(); return; }
  if (['ArrowRight', 'PageDown', ' ', 'j'].includes(event.key)) { event.preventDefault(); move(1); }
  if (['ArrowLeft', 'PageUp', 'k'].includes(event.key)) { event.preventDefault(); move(-1); }
});

applyPrefs();
const boot = $('boot-text');
if (boot.textContent.trim()) openDocument(boot.textContent, boot.dataset.source || 'File');
