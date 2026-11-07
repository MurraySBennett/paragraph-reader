import { test, expect } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

test('notes can be hidden, focused, and left without stealing typing', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('First paragraph.\n\nSecond paragraph.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await expect(page.getByRole('heading', { name: 'First paragraph.' })).toBeVisible();
  await page.keyboard.press('n');
  await expect(page.getByLabel('Note for current paragraph')).toBeFocused();
  await page.keyboard.type('next note');
  await expect(page.getByLabel('Note for current paragraph')).toHaveValue('next note');
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Reader text')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Second paragraph.' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'One.' })).toBeVisible();
  await page.getByRole('button', { name: 'Appearance' }).click();
  await page.getByLabel('Theme').selectOption('night');
  await page.getByLabel('Font size').fill('24');
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
  await page.locator('#chunk-text').evaluate(el => { const range = document.createRange(); range.setStart(el.firstChild, 0); range.setEnd(el.firstChild, 16); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); });
  await page.getByRole('button', { name: 'Read words' }).click();
  await expect(page.getByRole('dialog', { name: 'Word reader' })).toBeVisible();
  await page.getByLabel('Words per minute').fill('800');
  await expect(page.getByRole('dialog', { name: 'Word reader' })).toBeHidden({ timeout: 5000 });
  await expect(page.getByRole('heading', { name: 'Alpha beta gamma delta.' })).toBeVisible();
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
  await page.getByLabel('Restore backup').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.getByLabel('Note for current paragraph')).toHaveValue('Important note');
  await page.getByRole('button', { name: 'New document' }).click();
  await page.getByLabel('Paste text').fill('Different document.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByRole('button', { name: 'Utilities' }).click();
  await page.getByLabel('Restore backup').setInputFiles(await saved.path());
  await expect(page.getByRole('heading', { name: 'Keep this paragraph.' })).toBeVisible();
  await expect(page.getByLabel('Note for current paragraph')).toHaveValue('Important note');
});

test('browser extracts text from a PDF and reports invalid PDFs', async ({ page }) => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([400, 500]).drawText('PDF reading works.', { x: 50, y: 400, font, size: 18 });
  const buffer = Buffer.from(await pdf.save());
  await page.goto('/');
  await page.locator('#file').setInputFiles({ name: 'sample.pdf', mimeType: 'application/pdf', buffer });
  await expect(page.getByRole('heading', { name: 'PDF reading works.' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Utilities' }).click();
  await page.getByRole('button', { name: 'New document' }).click();
  await page.locator('#file').setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a pdf') });
  await expect(page.locator('#setup-status')).toContainText('Could not open this PDF');
});
