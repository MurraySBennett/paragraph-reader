import test from 'node:test';
import assert from 'node:assert/strict';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { importFile } from '../src/import-file.js';
import { passagesFromDocxHtml } from '../src/docx.js';

test('DOCX file import extracts heading, bold text and bullet item', async () => {
  const document = new Document({ sections: [{ children: [
    new Paragraph({ text: 'A Word heading', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun('A '), new TextRun({ text: 'bold', bold: true }), new TextRun(' word.')] }),
    new Paragraph({ text: 'First item', bullet: { level: 0 } }),
  ] }] });
  const file = new File([await Packer.toBuffer(document)], 'sample.docx');
  const parsed = await importFile(file);
  assert.deepEqual(parsed.blocks.map(block => [block.kind, block.text]), [
    ['heading', 'A Word heading'], ['paragraph', 'A bold word.'], ['list-item', 'First item'],
  ]);
  assert.equal(parsed.blocks[1].runs.find(run => run.text === 'bold').bold, true);
});

test('legacy DOC and corrupt DOCX fail before changing a document', async () => {
  await assert.rejects(importFile(new File(['old'], 'old.doc')), /\.docx/);
  await assert.rejects(importFile(new File(['bad zip'], 'bad.docx')), /damaged|invalid|could not/i);
});

test('DOCX HTML conversion strips unsafe links and ignores media', () => {
  const parsed = passagesFromDocxHtml('<h1>Title</h1><p><a href="javascript:alert(1)">unsafe</a> and <a href="https://example.org">safe</a><img src="data:bad"></p>', 'sample.docx');
  assert.equal(parsed.text, 'Title\n\nunsafe and safe');
  assert.equal(parsed.blocks[1].runs.find(run => run.text.includes('unsafe')).href, null);
  assert.equal(parsed.blocks[1].runs.find(run => run.text === 'safe').href, 'https://example.org/');
});

test('oversized DOCX fails before conversion', async () => {
  const huge = new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'huge.docx');
  await assert.rejects(importFile(huge), /15 MB/);
});
