import { test, expect } from '@playwright/test';

test('Markdown chunks render semantic emphasis, headings, lists and safe links', async ({ page }) => {
  await page.goto('/');
  await page.locator('#file').setInputFiles({ name: 'guide.md', mimeType: 'text/markdown', buffer: Buffer.from('# Guide\n\nA **bold** *word* and [source](https://example.org).\n\n- One\n- Two') });
  await expect(page.locator('#chunk-text h1')).toHaveText('Guide');
  await page.getByRole('button', { name: 'Next chunk' }).click();
  await expect(page.locator('#chunk-text strong')).toHaveText('bold');
  await expect(page.locator('#chunk-text em')).toHaveText('word');
  await expect(page.locator('#chunk-text a')).toHaveAttribute('href', 'https://example.org/');
  await page.locator('#chunk-text a').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#chunk-text strong')).toHaveText('bold');
  await page.getByRole('button', { name: 'Next chunk' }).click();
  await expect(page.locator('#chunk-text ul li')).toHaveText('One');
});

test('selected marked text in page mode returns to the correct note', async ({ page }) => {
  await page.goto('/');
  await page.locator('#file').setInputFiles({ name: 'guide.md', mimeType: 'text/markdown', buffer: Buffer.from('First paragraph.\n\nSecond **important words** here.') });
  await page.getByLabel('Reading unit').selectOption('page');
  await page.locator('#chunk-text strong').evaluate(el => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
  });
  await page.getByRole('button', { name: 'Read words' }).click();
  await page.getByRole('button', { name: 'Back to reading' }).click();
  await expect(page.locator('#note-title')).toHaveText('Paragraph 2');
});

test('unsafe Markdown links remain ordinary text', async ({ page }) => {
  await page.goto('/');
  await page.locator('#file').setInputFiles({ name: 'unsafe.md', mimeType: 'text/markdown', buffer: Buffer.from('A [bad](javascript:alert(1)) link.') });
  await expect(page.locator('#chunk-text a')).toHaveCount(0);
  await expect(page.locator('#chunk-text')).toContainText('bad');
});
