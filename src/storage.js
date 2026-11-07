import { splitParagraphs } from './content.js';

const KEY = 'paragraph-reader:v2:';

export async function fingerprint(text) {
  const bytes = new TextEncoder().encode(String(text));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createDocument(name, text) {
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) throw new Error('No readable text found.');
  return { version: 2, id: await fingerprint(text), name: String(name || 'Pasted text'), text: String(text), index: 0, notes: {}, updated: new Date().toISOString() };
}

export function saveDocument(storage, doc) {
  storage.setItem(KEY + doc.id, JSON.stringify(doc));
}

export function loadDocument(storage, id) {
  const raw = storage.getItem(KEY + id);
  if (!raw) return null;
  try {
    const doc = JSON.parse(raw);
    return doc?.version === 2 && doc.id === id ? doc : null;
  } catch { return null; }
}

export async function parseBackup(json) {
  let data;
  try { data = JSON.parse(json); } catch { throw new Error('Invalid backup JSON.'); }
  const doc = data?.document;
  if (data?.version !== 2 || !doc || doc.version !== 2 || typeof doc.text !== 'string' || typeof doc.name !== 'string' || !doc.notes || typeof doc.notes !== 'object' || !Number.isInteger(doc.index)) {
    throw new Error('Invalid paragraph reader backup.');
  }
  const paragraphs = splitParagraphs(doc.text);
  if (!paragraphs.length || doc.id !== await fingerprint(doc.text) || doc.index < 0 || doc.index >= paragraphs.length) throw new Error('Invalid paragraph reader backup.');
  for (const [key, note] of Object.entries(doc.notes)) {
    const i = Number(key);
    if (!Number.isInteger(i) || i < 0 || i >= paragraphs.length || typeof note?.text !== 'string' || note.source !== await fingerprint(paragraphs[i])) throw new Error('Invalid paragraph reader backup.');
  }
  const preferences = data.preferences ?? {};
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) throw new Error('Invalid paragraph reader backup.');
  return { document: doc, preferences };
}
