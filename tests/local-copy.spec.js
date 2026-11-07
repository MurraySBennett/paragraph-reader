import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { readFile, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { unzipSync } from 'fflate';
import assert from 'node:assert/strict';

const packageFiles = unzipSync(new Uint8Array(await readFile('dist/paragraph-reader-2026-11-07.zip')));
for (const name of ['paragraph-reader.html', 'START-HERE.txt', 'samples/README.md', 'samples/dutch-auctions.pdf', 'samples/lion-and-mouse.docx', 'samples/rainbow-passage.txt', 'samples/human-machine-teams.tex', 'samples/la-llave-de-lucia.md', 'samples/grin-readme.md', 'licenses/LICENSE', 'licenses/FFLATE-LICENSE', 'licenses/OPENDYSLEXIC-OFL.txt']) assert.ok(packageFiles[name], `Missing ${name} from offline package`);
const packageDir = await mkdtemp(join(tmpdir(), 'paragraph-reader-package-'));
for (const [name, bytes] of Object.entries(packageFiles)) {
  assert.ok(!name.startsWith('/') && !name.split('/').includes('..'), `Unsafe package path: ${name}`);
  const path = join(packageDir, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}
const localUrl = pathToFileURL(join(packageDir, 'paragraph-reader.html')).href;

test('downloaded HTML opens examples locally, including DOCX and PDF', async ({ page }) => {
  await page.goto(localUrl);
  await expect(page.locator('#download-copy')).toBeHidden();
  for (const [name, excerpt] of [['lion-and-mouse.docx', 'Lion and the Mouse'], ['dutch-auctions.pdf', 'Going, going, gone']]) {
    if (name.endsWith('.pdf')) await page.getByText('More examples').click();
    await page.locator(`[data-sample="${name}"]`).getByRole('button', { name: 'Read example' }).click();
    await expect(page.locator('#chunk-text')).toContainText(excerpt, { timeout: 20000 });
    await page.getByRole('button', { name: 'Utilities' }).click();
    await page.getByRole('button', { name: 'New document' }).click();
  }
});

test('downloaded HTML imports fresh PDF and DOCX files locally', async ({ page }) => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([400, 500]).drawText('Fresh local PDF.', { x: 50, y: 400, font, size: 18 });
  await page.goto(localUrl);
  await page.locator('#file').setInputFiles({ name: 'fresh.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) });
  await expect(page.locator('#chunk-text')).toContainText('Fresh local PDF.', { timeout: 10000 });
  await page.getByRole('button', { name: 'Utilities' }).click();
  await page.getByRole('button', { name: 'New document' }).click();
  await page.locator('#file').setInputFiles({ name: 'fresh.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from(packageFiles['samples/lion-and-mouse.docx']) });
  await expect(page.locator('#chunk-text')).toContainText('Lion and the Mouse');
  for (const [name, content, excerpt] of [
    ['fresh.txt', 'Plain local source.', 'Plain local source.'],
    ['fresh.md', '# Markdown local source\n\nA paragraph.', 'Markdown local source'],
    ['fresh.tex', '\\section{TeX local source}\n\nA paragraph.', 'TeX local source'],
  ]) {
    await page.getByRole('button', { name: 'Utilities' }).click();
    await page.getByRole('button', { name: 'New document' }).click();
    await page.locator('#file').setInputFiles({ name, mimeType: 'text/plain', buffer: Buffer.from(content) });
    await expect(page.locator('#chunk-text')).toContainText(excerpt);
  }
});

test('local copy remains readable when browser storage is blocked', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } }));
  await page.goto(localUrl);
  await expect(page.locator('#install-guidance')).toContainText('cannot keep notes');
  await page.locator('[data-sample="rainbow-passage.txt"]').getByRole('button', { name: 'Read example' }).click();
  await expect(page.locator('#chunk-text')).toContainText('Rainbow Passage');
});

test('local copy can export and restore a note backup', async ({ page }) => {
  await page.goto(localUrl);
  await page.getByLabel('Paste text').fill('A local note to keep.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByLabel('Note for current paragraph').fill('Remember this.');
  await page.getByRole('button', { name: 'Utilities' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const backup = await pending;
  await page.getByRole('button', { name: 'New document' }).click();
  await page.locator('#setup-import-backup').setInputFiles(await backup.path());
  await expect(page.getByLabel('Note for current paragraph')).toHaveValue('Remember this.');
});
