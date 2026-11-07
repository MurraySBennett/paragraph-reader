import { splitParagraphs } from './content.js';
import { validatePassages } from './passages.js';

const KEY = 'paragraph-reader:v2:';
const preferenceRules = {
  unit: value => ['paragraph', 'sentence', 'page'].includes(value),
  notes: value => typeof value === 'boolean',
  theme: value => ['system', 'paper', 'warm', 'slate', 'night', 'contrast', 'custom'].includes(value),
  fontSize: value => Number.isInteger(value) && value >= 16 && value <= 32,
  lineHeight: value => typeof value === 'number' && Number.isFinite(value) && value >= 1.3 && value <= 2.2,
  textWidth: value => Number.isInteger(value) && value >= 35 && value <= 130,
  pageWords: value => Number.isInteger(value) && value >= 50 && value <= 1000,
  wordWpm: value => Number.isInteger(value) && value >= 100 && value <= 800,
  wordSegment: value => ['sentence', 'paragraph'].includes(value),
  notesWidth: value => Number.isInteger(value) && value >= 20 && value <= 65,
  editorHeight: value => Number.isInteger(value) && value >= 120 && value <= 600,
  customBg: value => /^#[0-9a-f]{6}$/i.test(value),
  customText: value => /^#[0-9a-f]{6}$/i.test(value),
  customAccent: value => /^#[0-9a-f]{6}$/i.test(value),
  fontFamily: value => ['serif-classic', 'serif-literary', 'sans-system', 'sans-humanist', 'opendyslexic'].includes(value),
};

export function validPreferences(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.entries(value).every(([key, setting]) => preferenceRules[key]?.(setting) === true);
}

export async function fingerprint(text) {
  const bytes = new TextEncoder().encode(String(text));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createDocument(name, text, blocks = null) {
  const paragraphs = blocks ? blocks.map(block => block.text) : splitParagraphs(text);
  if (!paragraphs.length) throw new Error('No readable text found.');
  if (blocks && (!validatePassages(blocks) || blocks.map(block => block.text).join('\n\n') !== text)) throw new Error('Invalid document structure.');
  return { version: blocks ? 3 : 2, id: await fingerprint(text), name: String(name || 'Pasted text'), text: String(text), ...(blocks ? { blocks } : {}), index: 0, notes: {}, updated: new Date().toISOString() };
}

export function saveDocument(storage, doc) {
  storage.setItem(KEY + doc.id, JSON.stringify(doc));
}

export function loadDocument(storage, id) {
  const raw = storage.getItem(KEY + id);
  if (!raw) return null;
  try {
    const doc = JSON.parse(raw);
    return (doc?.version === 2 || (doc?.version === 3 && validatePassages(doc.blocks) && doc.blocks.map(block => block.text).join('\n\n') === doc.text)) && doc.id === id ? doc : null;
  } catch { return null; }
}

export async function parseBackup(json) {
  let data;
  try { data = JSON.parse(json); } catch { throw new Error('Invalid backup JSON.'); }
  const doc = data?.document;
  if (![2, 3].includes(data?.version) || !doc || doc.version !== data.version || typeof doc.text !== 'string' || typeof doc.name !== 'string' || !doc.notes || typeof doc.notes !== 'object' || Array.isArray(doc.notes) || !Number.isInteger(doc.index)) {
    throw new Error('Invalid paragraph reader backup.');
  }
  if (doc.version === 3 && (!validatePassages(doc.blocks) || doc.blocks.map(block => block.text).join('\n\n') !== doc.text)) throw new Error('Invalid paragraph reader backup.');
  const paragraphs = doc.version === 3 ? doc.blocks.map(block => block.text) : splitParagraphs(doc.text);
  if (!paragraphs.length || doc.id !== await fingerprint(doc.text) || doc.index < 0 || doc.index >= paragraphs.length) throw new Error('Invalid paragraph reader backup.');
  for (const [key, note] of Object.entries(doc.notes)) {
    const i = Number(key);
    if (!Number.isInteger(i) || i < 0 || i >= paragraphs.length || typeof note?.text !== 'string' || note.source !== await fingerprint(paragraphs[i])) throw new Error('Invalid paragraph reader backup.');
  }
  const preferences = data.preferences ?? {};
  if (!validPreferences(preferences)) throw new Error('Invalid paragraph reader backup.');
  return { document: doc, preferences };
}

export function findRecoverableDocuments(storage, name, currentId) {
  const found = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(KEY)) continue;
    const id = key.slice(KEY.length);
    if (id === currentId) continue;
    const doc = loadDocument(storage, id);
    if (doc?.name === name && Object.values(doc.notes || {}).some(note => typeof note?.text === 'string' && note.text.trim())) found.push(doc);
  }
  return found.sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')));
}
