import test from 'node:test';
import assert from 'node:assert/strict';
import { fingerprint, createDocument, saveDocument, loadDocument, parseBackup, validPreferences, findRecoverableDocuments } from '../src/storage.js';
import { parseMarkdown } from '../src/markdown.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), key: i => [...map.keys()][i] ?? null, get length() { return map.size; } };
}

test('same filename with changed content cannot inherit notes', async () => {
  const storage = memoryStorage();
  const oldDoc = await createDocument('essay.txt', 'An old paragraph.');
  oldDoc.notes[0] = { text: 'Keep this', source: await fingerprint('An old paragraph.') };
  saveDocument(storage, oldDoc);
  const changedDoc = await createDocument('essay.txt', 'A different paragraph.');
  assert.notEqual(oldDoc.id, changedDoc.id);
  assert.equal(loadDocument(storage, changedDoc.id), null);
});

test('malformed backup rejects before replacing current work', async () => {
  await assert.rejects(parseBackup('{"version":2,"text":"hello","notes":{"0":{"text":"oops","source":"wrong"}}}'), /backup/i);
  await assert.rejects(parseBackup('{bad json'), /backup/i);
});

test('backup round trip retains text, bookmark and anchored notes', async () => {
  const doc = await createDocument('sample.md', 'A paragraph.\n\nAnother one.');
  doc.index = 1;
  doc.notes[1] = { text: 'Look again', source: await fingerprint('Another one.') };
  const restored = await parseBackup(JSON.stringify({ version: 2, document: doc, preferences: { theme: 'night', notes: false } }));
  assert.equal(restored.document.text, doc.text);
  assert.equal(restored.document.index, 1);
  assert.equal(restored.document.notes[1].text, 'Look again');
  assert.deepEqual(restored.preferences, { theme: 'night', notes: false });
});

test('backup rejects invalid preferences and notes containers', async () => {
  const doc = await createDocument('sample.txt', 'Safe text.');
  await assert.rejects(parseBackup(JSON.stringify({ version: 2, document: doc, preferences: { fontSize: -100 } })), /backup/i);
  await assert.rejects(parseBackup(JSON.stringify({ version: 2, document: doc, preferences: { theme: 'missing' } })), /backup/i);
  doc.notes = [];
  await assert.rejects(parseBackup(JSON.stringify({ version: 2, document: doc })), /backup/i);
});

test('v3 backup preserves formatted passages and rejects unsafe marks', async () => {
  const parsed = parseMarkdown('A **bold** note.', 'note.md');
  const doc = await createDocument(parsed.name, parsed.text, parsed.blocks);
  assert.equal(doc.version, 3);
  const restored = await parseBackup(JSON.stringify({ version: 3, document: doc, preferences: { fontFamily: 'sans-system' } }));
  assert.equal(restored.document.blocks[0].runs.some(run => run.bold), true);
  doc.blocks[0].runs[0].href = 'javascript:alert(1)';
  await assert.rejects(parseBackup(JSON.stringify({ version: 3, document: doc, preferences: {} })), /backup/i);
});

test('font preference accepts listed families and rejects arbitrary CSS', () => {
  assert.equal(validPreferences({ fontFamily: 'opendyslexic' }), true);
  assert.equal(validPreferences({ fontFamily: 'url(https://evil.test)' }), false);
});

test('older same-name notes stay recoverable after a changed import', async () => {
  const storage = memoryStorage();
  const old = await createDocument('note.md', 'Old normalized text.');
  old.notes[0] = { text: 'Original note', source: await fingerprint('Old normalized text.') };
  saveDocument(storage, old);
  const current = await createDocument('note.md', 'New normalized text.');
  assert.deepEqual(findRecoverableDocuments(storage, 'note.md', current.id).map(item => item.notes[0].text), ['Original note']);
  assert.equal(loadDocument(storage, current.id), null);
});
