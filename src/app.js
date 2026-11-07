import { prepareText, splitParagraphs } from './content.js';
import { parsePlain, makeStructuredChunks } from './passages.js';
import { renderChunk, sourceAnchorForSelection } from './render-passages.js';
import { createDocument, fingerprint, loadDocument, saveDocument, parseBackup, validPreferences, findRecoverableDocuments } from './storage.js';
import { WordPlayer } from './word-mode.js';
import { readPdf } from './pdf.js';
import { importFile } from './import-file.js';
import { parseTex } from './tex.js';

const $ = id => document.getElementById(id);
const setup = $('setup'), shell = $('reader-shell'), card = $('paragraph'), note = $('note');
let doc = null, paragraphs = [], paragraphHashes = [], chunks = [], chunkIndex = 0, noteAnchor = null, wordSourceAnchor = null, saveTimer = 0, toastTimer = 0, recoveryDocs = [];
const PREF_KEY = 'paragraph-reader:preferences:v2';
const defaults = { unit: 'paragraph', notes: true, theme: 'system', fontFamily: 'serif-classic', fontSize: 20, lineHeight: 1.7, textWidth: 64, pageWords: 250, wordWpm: 300, notesWidth: 34, editorHeight: 240, customBg: '#f8f5ef', customText: '#202327', customAccent: '#345f68' };
const fontStacks = { 'serif-classic': 'Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif', 'serif-literary': 'Georgia, Cambria, Times New Roman, serif', 'sans-system': 'system-ui, -apple-system, Segoe UI, sans-serif', 'sans-humanist': 'Trebuchet MS, Gill Sans, Segoe UI, sans-serif', opendyslexic: 'OpenDyslexic, system-ui, sans-serif' };
let prefs = { ...defaults };
try { const saved = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); if (validPreferences(saved)) prefs = { ...defaults, ...saved }; } catch {}

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
  document.documentElement.style.setProperty('--reader-font', fontStacks[prefs.fontFamily] || fontStacks['serif-classic']);
  document.documentElement.style.setProperty('--line-height', String(prefs.lineHeight));
  document.documentElement.style.setProperty('--text-width', `${prefs.textWidth}ch`);
  document.documentElement.style.setProperty('--notes-width', `${prefs.notesWidth}%`);
  document.documentElement.style.setProperty('--editor-height', `${prefs.editorHeight}px`);
  for (const [id, value] of [['unit', prefs.unit], ['theme', prefs.theme], ['font-family', prefs.fontFamily], ['font-size', prefs.fontSize], ['line-height', prefs.lineHeight], ['text-width', prefs.textWidth], ['page-words', prefs.pageWords], ['custom-bg', prefs.customBg], ['custom-text', prefs.customText], ['custom-accent', prefs.customAccent]]) $(id).value = value;
  $('font-preview').textContent = doc?.text.slice(0, 100) || 'A paragraph to preview.';
  $('font-size-value').textContent = `${prefs.fontSize} px`;
  $('line-height-value').textContent = String(prefs.lineHeight);
  $('text-width-value').textContent = `${prefs.textWidth} ch`;
  $('custom-colors').hidden = prefs.theme !== 'custom';
  $('word-speed').value = prefs.wordWpm;
  $('word-speed-value').textContent = `${prefs.wordWpm} WPM`;
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
  clearTimeout(saveTimer);
  doc.updated = new Date().toISOString();
  try { saveDocument(localStorage, doc); } catch { status('Could not save this document. Download a backup.', true); }
}

function renderNotes() {
  const current = noteAnchor ?? chunks[chunkIndex]?.start ?? 0;
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
      chunkIndex = Math.max(0, found); noteAnchor = Number(key); render(); note.focus();
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
  renderChunk($('chunk-text'), chunk);
  $('previous').disabled = chunkIndex === 0;
  $('next').disabled = chunkIndex === chunks.length - 1;
  renderNotes(); saveDocSoon();
}

function setUnit(unit) {
  const current = chunks[chunkIndex]?.start ?? doc?.index ?? 0;
  noteAnchor = null;
  prefs.unit = ['paragraph', 'sentence', 'page'].includes(unit) ? unit : 'paragraph';
  chunks = makeStructuredChunks(doc.version === 3 ? doc.blocks : parsePlain(doc.text, doc.name).blocks, prefs.unit, prefs.pageWords);
  chunkIndex = Math.max(0, chunks.findIndex(chunk => chunk.start <= current && chunk.end >= current));
  savePrefs(); render();
}

async function openDocument(text, name = 'Pasted text', preparedAlready = false, blocks = null) {
  const prepared = preparedAlready ? text : prepareText(text, name);
  try {
    const nextDoc = await createDocument(name, prepared, blocks);
    const saved = loadDocument(localStorage, nextDoc.id);
    doc = saved && saved.text === nextDoc.text ? (blocks && saved.version === 2 ? { ...saved, version: 3, blocks } : saved) : nextDoc;
    paragraphs = doc.version === 3 ? doc.blocks.map(block => block.text) : splitParagraphs(doc.text);
    recoveryDocs = findRecoverableDocuments(localStorage, doc.name, doc.id);
    $('earlier-notes').hidden = recoveryDocs.length === 0;
    noteAnchor = null;
    paragraphHashes = await Promise.all(paragraphs.map(fingerprint));
    // Drop notes whose source text changed in a malformed or old saved record.
    for (const [key, value] of Object.entries(doc.notes)) if (paragraphHashes[Number(key)] !== value?.source) delete doc.notes[key];
    setup.hidden = true; shell.hidden = false;
    chunks = makeStructuredChunks(doc.version === 3 ? doc.blocks : parsePlain(doc.text, doc.name).blocks, prefs.unit, prefs.pageWords);
    chunkIndex = Math.max(0, chunks.findIndex(chunk => chunk.start <= doc.index && chunk.end >= doc.index));
    render(); card.focus(); return true;
  } catch (error) { $('setup-status').textContent = error.message || 'Could not read this document.'; return false; }
}

async function openImportedFile(file) {
  const pdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
  if (pdf && $('boot-text').dataset.cli === 'true') throw new Error('To open a PDF from a local reader page, run paragraph-reader <file.pdf> in the terminal.');
  const parsed = await importFile(file);
  return openDocument(parsed.text, parsed.name, true, parsed.blocks);
}

function move(delta) { if (!doc) return; const target = Math.max(0, Math.min(chunks.length - 1, chunkIndex + delta)); if (target !== chunkIndex) { chunkIndex = target; noteAnchor = null; render(); } }

$('start').addEventListener('click', () => openDocument($('input').value));
$('input').addEventListener('keydown', event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) openDocument($('input').value); });
$('file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    $('setup-status').textContent = 'Opening file…';
    if (await openImportedFile(file)) $('setup-status').textContent = '';
  } catch (error) { $('setup-status').textContent = error.message || 'Could not open that file.'; }
  event.target.value = '';
});
$('previous').addEventListener('click', () => move(-1));
$('next').addEventListener('click', () => move(1));
$('read-focus').addEventListener('click', () => card.focus());
$('notes-toggle').addEventListener('click', () => setNotesVisible(!prefs.notes));
$('unit').addEventListener('change', event => setUnit(event.target.value));
note.addEventListener('input', () => {
  const i = noteAnchor ?? chunks[chunkIndex].start;
  if (note.value.trim()) doc.notes[i] = { text: note.value, source: paragraphHashes[i] };
  else delete doc.notes[i];
  renderNoteIndexWithoutInput(); saveDoc();
});
function renderNoteIndexWithoutInput() { const start = note.selectionStart, end = note.selectionEnd; renderNotes(); note.focus(); note.setSelectionRange(start, end); }

$('appearance-open').addEventListener('click', () => { $('font-preview').textContent = chunks[chunkIndex]?.text.slice(0, 100) || 'A paragraph to preview.'; $('appearance').showModal(); });
$('appearance-close').addEventListener('click', () => $('appearance').close());
function showAppearanceTab(name) {
  for (const section of ['themes', 'typography']) {
    const active = section === name;
    $(`${section}-panel`).hidden = !active;
    $(`${section}-tab`).setAttribute('aria-selected', String(active));
    $(`${section}-tab`).tabIndex = active ? 0 : -1;
  }
  $(`${name}-tab`).focus();
}
for (const section of ['themes', 'typography']) {
  $(`${section}-tab`).addEventListener('click', () => showAppearanceTab(section));
  $(`${section}-tab`).addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); showAppearanceTab(section === 'themes' ? 'typography' : 'themes'); }
  });
}
for (const [id, key, cast] of [['theme', 'theme', String], ['font-family', 'fontFamily', String], ['font-size', 'fontSize', Number], ['line-height', 'lineHeight', Number], ['text-width', 'textWidth', Number], ['page-words', 'pageWords', Number], ['custom-bg', 'customBg', String], ['custom-text', 'customText', String], ['custom-accent', 'customAccent', String]]) {
  $(id).addEventListener('input', event => { prefs[key] = cast(event.target.value); applyPrefs(); savePrefs(); if (id === 'page-words' && doc && prefs.unit === 'page') setUnit('page'); });
}
$('utilities-open').addEventListener('click', () => { const open = $('utilities').hidden; $('utilities').hidden = !open; $('utilities-open').setAttribute('aria-expanded', String(open)); });
$('earlier-notes').addEventListener('click', () => {
  const list = $('earlier-notes-list');
  list.replaceChildren();
  recoveryDocs.forEach((earlier, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Download earlier notes ${index + 1} (${Object.keys(earlier.notes).length} notes)`;
    button.addEventListener('click', () => download(`${safeName()}.earlier-${earlier.id.slice(0, 8)}.reader.json`, JSON.stringify({ version: earlier.version, document: earlier, preferences: prefs }, null, 2), 'application/json'));
    list.append(button);
  });
  $('earlier-notes-dialog').showModal();
});
$('earlier-notes-close').addEventListener('click', () => $('earlier-notes-dialog').close());
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
$('export-backup').addEventListener('click', () => { if (!doc) return; saveDoc(); download(`${safeName()}.reader.json`, JSON.stringify({ version: doc.version, document: doc, preferences: prefs }, null, 2), 'application/json'); });
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
async function restoreBackup(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    const restored = await parseBackup(await file.text());
    await openDocument(restored.document.text, restored.document.name, true, restored.document.blocks || null);
    doc = restored.document;
    prefs = { ...defaults, ...restored.preferences };
    applyPrefs(); savePrefs();
    paragraphs = doc.version === 3 ? doc.blocks.map(block => block.text) : splitParagraphs(doc.text);
    noteAnchor = null;
    paragraphHashes = await Promise.all(paragraphs.map(fingerprint));
    chunks = makeStructuredChunks(doc.version === 3 ? doc.blocks : parsePlain(doc.text, doc.name).blocks, prefs.unit, prefs.pageWords);
    chunkIndex = Math.max(0, chunks.findIndex(chunk => chunk.start <= doc.index && chunk.end >= doc.index));
    render(); saveDoc(); $('utilities').hidden = true; status('Backup restored');
  } catch (error) {
    const message = error.message || 'Could not restore backup.';
    if (setup.hidden) status(message, true);
    else $('setup-status').textContent = message;
  }
  event.target.value = '';
}
for (const id of ['import-backup', 'setup-import-backup']) $(id).addEventListener('change', restoreBackup);

const player = new WordPlayer({
  onWord: (word, index, total) => { $('word-display').textContent = word; $('word-progress').textContent = `${index} / ${total}`; },
  onFinish: finishWordMode,
});
function finishWordMode() {
  player.stop(false);
  if ($('word-mode').open) $('word-mode').close();
  $('word-play').textContent = 'Pause';
  noteAnchor = wordSourceAnchor;
  renderNotes();
  card.focus();
}
$('word-start').addEventListener('click', () => {
  if (!doc) return;
  const selection = getSelection();
  const selected = selection?.toString().trim();
  const inCard = selected && card.contains(selection.anchorNode);
  const text = inCard ? selected : chunks[chunkIndex].text;
  wordSourceAnchor = inCard ? sourceAnchorForSelection(chunks[chunkIndex], selection) : chunks[chunkIndex].start;
  if (!text) return;
  $('word-mode').showModal();
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
$('word-speed').addEventListener('input', event => { player.setWpm(event.target.value); prefs.wordWpm = player.wpm; $('word-speed-value').textContent = `${player.wpm} WPM`; savePrefs(); });
$('word-mode').addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); finishWordMode(); }
  if (event.key === 'Tab') {
    const controls = [$('word-exit'), $('word-play'), $('word-speed')];
    const current = controls.indexOf(document.activeElement);
    if (event.shiftKey && current <= 0) { event.preventDefault(); controls.at(-1).focus(); }
    else if (!event.shiftKey && current === controls.length - 1) { event.preventDefault(); controls[0].focus(); }
  }
});

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
  if (event.defaultPrevented || shell.hidden || $('word-mode').open || $('appearance').open || $('shortcuts').open) return;
  if (event.key === 'Escape' && document.activeElement === note) { event.preventDefault(); card.focus(); return; }
  const target = event.target;
  if (target instanceof HTMLElement && (target.matches('input, textarea, select, button, a') || target.isContentEditable)) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key.toLowerCase() === 'n' && prefs.notes) { event.preventDefault(); note.focus(); return; }
  if (['ArrowRight', 'PageDown', ' ', 'j'].includes(event.key)) { event.preventDefault(); move(1); }
  if (['ArrowLeft', 'PageUp', 'k'].includes(event.key)) { event.preventDefault(); move(-1); }
});

applyPrefs();
const boot = $('boot-text');
if (boot.textContent.trim()) {
  const text = boot.dataset.encoding === 'base64'
    ? new TextDecoder().decode(Uint8Array.from(atob(boot.textContent.trim()), char => char.charCodeAt(0)))
    : boot.textContent;
  const source = boot.dataset.source || 'File';
  const parsed = boot.dataset.prepared === 'false' && /\.(tex|ltx)$/i.test(source) ? parseTex(text, source) : null;
  openDocument(parsed?.text ?? text, source, true, parsed?.blocks ?? null);
}
window.addEventListener('pagehide', saveDoc);
