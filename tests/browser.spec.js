import { test, expect } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

test('notes can be hidden, focused, and left without stealing typing', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('First paragraph.\n\nSecond paragraph.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await expect(page.locator('#chunk-text')).toContainText('First paragraph.');
  await page.keyboard.press('n');
  await expect(page.getByLabel('Note for current paragraph')).toBeFocused();
  await page.keyboard.type('next note');
  await expect(page.getByLabel('Note for current paragraph')).toHaveValue('next note');
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Reader text')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#chunk-text')).toContainText('Second paragraph.');
  await page.getByRole('button', { name: 'Hide notes' }).click();
  await expect(page.getByLabel('Note for current paragraph')).toBeHidden();
  await page.getByRole('button', { name: 'Show notes' }).click();
  await expect(page.getByLabel('Note for current paragraph')).toBeVisible();
});

test('reading unit, appearance, and pane size are adjustable', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('One. Two.\n\nThree.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByLabel('Reading unit').selectOption('sentence');
  await expect(page.locator('#chunk-text')).toContainText('One.');
  await page.getByRole('button', { name: 'Appearance' }).click();
  await expect(page.getByRole('tab', { name: 'Themes' })).toBeVisible();
  await page.getByLabel('Theme', { exact: true }).selectOption('night');
  await page.getByRole('tab', { name: 'Typography' }).click();
  await page.getByLabel('Font size').fill('24');
  await expect(page.getByLabel('Theme', { exact: true })).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'night');
  await expect(page.locator('#chunk-text')).toHaveCSS('font-size', '24px');
  await page.getByRole('button', { name: 'Close appearance' }).click();
  const before = await page.locator('#app').evaluate(el => getComputedStyle(el).gridTemplateColumns);
  await page.getByRole('separator', { name: 'Resize notes panel' }).focus();
  await page.keyboard.press('ArrowLeft');
  const after = await page.locator('#app').evaluate(el => getComputedStyle(el).gridTemplateColumns);
  expect(after).not.toBe(before);
});

test('selected words play and return to their paragraph with notes', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('Alpha beta gamma delta.\n\nAnother paragraph.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.locator('#chunk-text').evaluate(el => { const text = el.querySelector('p').firstChild; const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 16); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); });
  await page.getByRole('button', { name: 'Read words' }).click();
  await expect(page.getByRole('dialog', { name: 'Word reader' })).toBeVisible();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByLabel('Words per minute').fill('800');
  await expect(page.getByRole('button', { name: 'Next segment' })).toBeDisabled({ timeout: 5000 });
  await page.getByRole('button', { name: 'Back to reading' }).click();
  await expect(page.locator('#chunk-text')).toContainText('Alpha beta gamma delta.');
  await expect(page.getByLabel('Note for current paragraph')).toBeVisible();
});

test('backup restores notes while malformed import leaves current work alone', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('Keep this paragraph.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByLabel('Note for current paragraph').fill('Important note');
  await page.getByRole('button', { name: 'Utilities' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const saved = await download;
  await expect(page.getByRole('status').last()).toContainText('downloaded');
  await page.locator('#import-backup').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.getByLabel('Note for current paragraph')).toHaveValue('Important note');
  await page.getByRole('button', { name: 'New document' }).click();
  await page.getByLabel('Paste text').fill('Different document.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByRole('button', { name: 'Utilities' }).click();
  await page.locator('#import-backup').setInputFiles(await saved.path());
  await expect(page.locator('#chunk-text')).toContainText('Keep this paragraph.');
  await expect(page.getByLabel('Note for current paragraph')).toHaveValue('Important note');
});

test('browser extracts text from a PDF and reports invalid PDFs', async ({ page }) => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([400, 500]).drawText('PDF reading works.', { x: 50, y: 400, font, size: 18 });
  const buffer = Buffer.from(await pdf.save());
  await page.goto('/');
  await page.locator('#file').setInputFiles({ name: 'sample.pdf', mimeType: 'application/pdf', buffer });
  await expect(page.locator('#chunk-text')).toContainText('PDF reading works.', { timeout: 10000 });
  await page.getByRole('button', { name: 'Utilities' }).click();
  await page.getByRole('button', { name: 'New document' }).click();
  await page.locator('#file').setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a pdf') });
  await expect(page.locator('#setup-status')).toContainText('Could not open this PDF');
});

test('self-contained CLI page opens bootstrapped text from file URL', async ({ page }) => {
  const path = execFileSync('python3', ['-c', `import runpy; from pathlib import Path; c=runpy.run_path('bin/paragraph-reader'); print(c['build_page'](Path('sample.txt'), 'CLI café text.').as_uri())`], { cwd: process.cwd(), encoding: 'utf8' }).trim();
  await page.goto(path);
  await expect(page.locator('#chunk-text')).toContainText('CLI café text.');
  await page.getByRole('button', { name: 'Utilities' }).click();
  await page.getByRole('button', { name: 'New document' }).click();
  await page.locator('#file').setInputFiles({ name: 'sample.pdf', mimeType: 'application/pdf', buffer: Buffer.from('PDF') });
  await expect(page.locator('#setup-status')).toContainText('paragraph-reader <file.pdf>');
});

test('CLI TeX page keeps list items and following prose', async ({ page }) => {
  const path = execFileSync('python3', ['-c', `import runpy; from pathlib import Path; c=runpy.run_path('bin/paragraph-reader'); p=Path('sample.tex'); print(c['build_page'](p, r'\\begin{itemize}\\item One\\item Two\\end{itemize}' + chr(10)*2 + 'After list.').as_uri())`], { cwd: process.cwd(), encoding: 'utf8' }).trim();
  await page.goto(path);
  await expect(page.locator('#chunk-text li')).toContainText('One');
  await page.getByRole('button', { name: 'Next chunk' }).click();
  await expect(page.locator('#chunk-text')).toContainText('Two');
  await page.getByRole('button', { name: 'Next chunk' }).click();
  await expect(page.locator('#chunk-text')).toContainText('After list.');
});

test('selected passage in a page returns notes to its source paragraph', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('First paragraph.\n\nSecond paragraph has words.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByLabel('Reading unit').selectOption('page');
  await page.locator('#chunk-text').evaluate(el => { const text = el.querySelectorAll('p')[1].firstChild; const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 6); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); });
  await page.getByRole('button', { name: 'Read words' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Back to reading' }).click();
  await expect(page.locator('#note-title')).toHaveText('Paragraph 2');
  await page.getByLabel('Note for current paragraph').fill('About second');
  await page.getByLabel('Reading unit').selectOption('paragraph');
  await page.getByRole('button', { name: 'Next chunk' }).click();
  await expect(page.getByLabel('Note for current paragraph')).toHaveValue('About second');
});

test('word mode opens paused and waits for N between sentences', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('First sentence. Second sentence.\n\nThird paragraph.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByRole('button', { name: 'Read words' }).click();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await expect(page.locator('#word-display')).toBeEmpty();
  await expect(page.getByLabel('Word segment')).toHaveValue('sentence');
  await page.getByLabel('Words per minute').fill('100');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.locator('#word-progress')).toContainText('Segment 1 of 3');
  await expect(page.locator('#word-progress')).toContainText('1 / 2 words');
  await page.getByLabel('Words per minute').fill('800');
  await expect(page.getByRole('button', { name: 'Next segment' })).toBeEnabled({ timeout: 3000 });
  await page.getByLabel('Words per minute').focus();
  await page.keyboard.press('n');
  await expect(page.locator('#word-progress')).toContainText('Segment 1 of 3');
  await page.getByRole('button', { name: 'Back to reading' }).focus();
  await page.keyboard.press('n');
  await expect(page.locator('#word-progress')).toContainText('Segment 2 of 3');
  await expect(page.getByRole('button', { name: 'Next segment' })).toBeEnabled({ timeout: 3000 });
  await page.getByRole('button', { name: 'Next segment' }).click();
  await expect(page.locator('#word-progress')).toContainText('Segment 3 of 3');
  await expect(page.getByRole('button', { name: 'Next segment' })).toBeDisabled({ timeout: 3000 });
  await expect(page.getByRole('dialog', { name: 'Word reader' })).toBeVisible();
});

test('word mode pauses, resumes and remembers paragraph segments', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('One two three four.\n\nFive six.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByRole('button', { name: 'Read words' }).click();
  await page.getByLabel('Word segment').selectOption('paragraph');
  await page.getByLabel('Words per minute').fill('100');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  const word = await page.locator('#word-display').textContent();
  await page.waitForTimeout(700);
  await expect(page.locator('#word-display')).toHaveText(word);
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Next segment' })).toBeEnabled({ timeout: 5000 });
  await page.getByRole('button', { name: 'Next segment' }).click();
  await expect(page.locator('#word-progress')).toContainText('Segment 2 of 2');
  await page.getByRole('button', { name: 'Back to reading' }).click();
  await page.getByRole('button', { name: 'Read words' }).click();
  await expect(page.getByLabel('Word segment')).toHaveValue('paragraph');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
});

test('word mode starts at the current sentence and changing segment choice resets it paused', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('First. Second.\n\nThird.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByLabel('Reading unit').selectOption('sentence');
  await page.getByRole('button', { name: 'Next chunk' }).click();
  await page.getByRole('button', { name: 'Read words' }).click();
  await expect(page.locator('#word-progress')).toContainText('Segment 1 of 2');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.locator('#word-display')).toHaveText('Second.');
  await page.getByLabel('Word segment').selectOption('paragraph');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await expect(page.locator('#word-display')).toBeEmpty();
  await expect(page.locator('#word-progress')).toContainText('Segment 1 of 2');
});

test('selected paragraphs bound word mode and retain paragraph segmentation', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('First selected.\n\nSecond selected.\n\nThird outside.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByLabel('Reading unit').selectOption('page');
  await page.locator('#chunk-text').evaluate(el => {
    const parts = el.querySelectorAll('p');
    const range = document.createRange();
    range.setStart(parts[0].firstChild, 0);
    range.setEnd(parts[1].firstChild, parts[1].textContent.length);
    getSelection().removeAllRanges(); getSelection().addRange(range);
  });
  await page.getByRole('button', { name: 'Read words' }).click();
  await page.getByLabel('Word segment').selectOption('paragraph');
  await expect(page.locator('#word-progress')).toContainText('Segment 1 of 2');
  await page.getByLabel('Words per minute').fill('800');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next segment' })).toBeEnabled({ timeout: 3000 });
  await page.getByRole('button', { name: 'Next segment' }).click();
  await expect(page.locator('#word-progress')).toContainText('Segment 2 of 2');
  await page.getByRole('button', { name: 'Back to reading' }).click();
  await expect(page.locator('#note-title')).toHaveText('Paragraph 1');
});

test('word speed is remembered across sessions', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('A few words to read.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByRole('button', { name: 'Read words' }).click();
  await page.getByLabel('Words per minute').fill('800');
  await page.getByRole('button', { name: 'Back to reading' }).click();
  await page.reload();
  await page.getByLabel('Paste text').fill('A few words to read.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByRole('button', { name: 'Read words' }).click();
  await expect(page.getByLabel('Words per minute')).toHaveValue('800');
});

test('setup and reader have no critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  let result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter(item => ['critical', 'serious'].includes(item.impact))).toEqual([]);
  await page.getByLabel('Paste text').fill('A paragraph to inspect.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter(item => ['critical', 'serious'].includes(item.impact))).toEqual([]);
});

test('static release serves the reader from its own directory', async ({ page }) => {
  await page.goto('/dist/index.html');
  await page.getByLabel('Paste text').fill('Hosted reading works.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await expect(page.locator('#chunk-text')).toContainText('Hosted reading works.');
});

test('notes survive an immediate reload and separator keys do not navigate', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('First paragraph.\n\nSecond paragraph.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByLabel('Note for current paragraph').fill('Keep immediately');
  await page.reload();
  await page.getByLabel('Paste text').fill('First paragraph.\n\nSecond paragraph.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await expect(page.getByLabel('Note for current paragraph')).toHaveValue('Keep immediately');
  await page.getByRole('separator', { name: 'Resize notes panel' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#chunk-text')).toContainText('First paragraph.');
});

test('file controls are keyboard reachable and backup restores from setup', async ({ page }) => {
  await page.goto('/');
  await page.locator('#file').focus();
  await expect(page.locator('#file')).toBeFocused();
  const doc = await page.evaluate(async () => {
    const text = 'Restored from setup.';
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    const id = [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
    return { version: 2, id, name: 'backup.txt', text, index: 0, notes: {}, updated: new Date().toISOString() };
  });
  await page.locator('#setup-import-backup').setInputFiles({ name: 'reading.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 2, document: doc, preferences: {} })) });
  await expect(page.locator('#chunk-text')).toContainText('Restored from setup.');
});

test('word reader keeps keyboard focus inside its dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('One two three four five six seven eight nine ten.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByRole('button', { name: 'Read words' }).click();
  await expect(page.getByRole('dialog', { name: 'Word reader' })).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => document.activeElement.closest('#word-mode') !== null)).toBe(true);
  await page.getByRole('button', { name: 'Back to reading' }).click();
  await expect(page.getByLabel('Reader text')).toBeFocused();
});

test('reader font selection persists and applies to word mode', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('Readable text.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByRole('button', { name: 'Appearance' }).click();
  await page.getByRole('tab', { name: 'Typography' }).click();
  await expect(page.locator('#font-preview')).toContainText('Readable text.');
  await page.getByLabel('Reader font').selectOption('sans-system');
  await expect(page.locator('#chunk-text')).toHaveCSS('font-family', /system-ui/);
  await page.getByRole('button', { name: 'Close appearance' }).click();
  await page.getByRole('button', { name: 'Read words' }).click();
  await expect(page.locator('#word-display')).toHaveCSS('font-family', /system-ui/);
  await page.reload();
  await page.getByLabel('Paste text').fill('Readable text.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByRole('button', { name: 'Appearance' }).click();
  await page.getByRole('tab', { name: 'Typography' }).click();
  await expect(page.getByLabel('Reader font')).toHaveValue('sans-system');
});

test('changed same-name import offers earlier notes as a backup', async ({ page }) => {
  await page.goto('/');
  await page.locator('#file').setInputFiles({ name: 'same.md', mimeType: 'text/markdown', buffer: Buffer.from('Old paragraph.') });
  await page.getByLabel('Note for current paragraph').fill('Earlier note');
  await page.getByRole('button', { name: 'Utilities' }).click();
  await page.getByRole('button', { name: 'New document' }).click();
  await page.locator('#file').setInputFiles({ name: 'same.md', mimeType: 'text/markdown', buffer: Buffer.from('Changed paragraph.') });
  await expect(page.getByLabel('Note for current paragraph')).toHaveValue('');
  await page.getByRole('button', { name: 'Utilities' }).click();
  await page.getByRole('button', { name: 'Earlier notes' }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download earlier notes/ }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toMatch(/\.reader\.json$/);
});

test('formatted Markdown backup stores validated passages', async ({ page }) => {
  await page.goto('/');
  await page.locator('#file').setInputFiles({ name: 'marked.md', mimeType: 'text/markdown', buffer: Buffer.from('# Heading\n\nA **bold** result.') });
  await page.getByRole('button', { name: 'Utilities' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const backup = JSON.parse(readFileSync(await (await pending).path(), 'utf8'));
  expect(backup.version).toBe(3);
  expect(backup.document.blocks.map(block => block.kind)).toEqual(['heading', 'paragraph']);
  expect(backup.document.blocks[1].runs.some(run => run.bold)).toBe(true);
});
