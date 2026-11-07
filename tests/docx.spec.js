import { test, expect } from '@playwright/test';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

async function makeDocx() {
  const document = new Document({ sections: [{ children: [
    new Paragraph({ text: 'A Word heading', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun('A '), new TextRun({ text: 'bold', bold: true }), new TextRun(' word.')] }),
    new Paragraph({ text: 'First item', bullet: { level: 0 } }),
  ] }] });
  return Packer.toBuffer(document);
}

test('DOCX import extracts semantic passages locally', async ({ page }) => {
  const data = (await makeDocx()).toString('base64');
  await page.goto('/dist/index.html');
  const parsed = await page.evaluate(async base64 => {
    const { importFile } = await import('/dist/import-file.js');
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    return importFile(new File([bytes], 'sample.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
  }, data);
  expect(parsed.blocks.map(block => [block.kind, block.text])).toEqual([
    ['heading', 'A Word heading'], ['paragraph', 'A bold word.'], ['list-item', 'First item'],
  ]);
  expect(parsed.blocks[1].runs.find(run => run.text === 'bold').bold).toBe(true);
});

test('legacy DOC and invalid DOCX give useful errors', async ({ page }) => {
  await page.goto('/dist/index.html');
  const messages = await page.evaluate(async () => {
    const { importFile } = await import('/dist/import-file.js');
    const failures = [];
    for (const [name, bytes] of [['old.doc', 'old binary'], ['bad.docx', 'bad zip']]) {
      try { await importFile(new File([bytes], name)); }
      catch (error) { failures.push(error.message); }
    }
    return failures;
  });
  expect(messages[0]).toContain('.docx');
  expect(messages[1]).toMatch(/damaged|invalid|could not/i);
});

test('DOCX upload opens text and invalid upload keeps saved notes', async ({ page }) => {
  const buffer = await makeDocx();
  await page.goto('/');
  await page.getByLabel('Paste text').fill('Keep this note.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByLabel('Note for current paragraph').fill('Important');
  await page.getByRole('button', { name: 'Utilities' }).click();
  await page.getByRole('button', { name: 'New document' }).click();
  await page.locator('#file').setInputFiles({ name: 'bad.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('bad') });
  await expect(page.locator('#setup-status')).toContainText('Could not open this DOCX');
  await page.locator('#file').setInputFiles({ name: 'sample.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer });
  await expect(page.locator('#chunk-text')).toContainText('A Word heading');
  await page.getByRole('button', { name: 'Utilities' }).click();
  await page.getByRole('button', { name: 'New document' }).click();
  await page.getByLabel('Paste text').fill('Keep this note.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await expect(page.getByLabel('Note for current paragraph')).toHaveValue('Important');
});
