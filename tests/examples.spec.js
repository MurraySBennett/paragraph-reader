import { test, expect } from '@playwright/test';

test('homepage examples open through their source formats', async ({ page }) => {
  await page.goto('/');
  for (const [file, excerpt] of [
    ['rainbow-passage.txt', 'Rainbow Passage'],
    ['la-llave-de-lucia.md', 'La llave de Lucía'],
    ['lion-and-mouse.docx', 'Lion and the Mouse'],
    ['human-machine-teams.tex', 'Human Performance'],
  ]) {
    const card = page.locator(`[data-sample="${file}"]`);
    await expect(card).toBeVisible({ timeout: 2000 });
    await card.getByRole('button', { name: 'Read example' }).click();
    await expect(page.locator('#document-name')).toHaveText(file);
    await expect(page.locator('#chunk-text')).toContainText(excerpt);
    await page.getByRole('button', { name: 'Utilities' }).click();
    await page.getByRole('button', { name: 'New document' }).click();
  }
});

test('more examples import PDF and Markdown', async ({ page }) => {
  await page.goto('/');
  await page.getByText('More examples').click();
  for (const [file, excerpt] of [
    ['dutch-auctions.pdf', 'Going, going, gone'],
    ['grin-readme.md', 'GRIN'],
  ]) {
    await page.locator(`[data-sample="${file}"]`).getByRole('button', { name: 'Read example' }).click();
    await expect(page.locator('#document-name')).toHaveText(file, { timeout: 20000 });
    await expect(page.locator('#chunk-text')).toContainText(excerpt);
    await page.getByRole('button', { name: 'Utilities' }).click();
    await page.getByRole('button', { name: 'New document' }).click();
  }
});

test('sample source can be downloaded with visible attribution', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('[data-sample="rainbow-passage.txt"]');
  await expect(card).toBeVisible({ timeout: 2000 });
  await expect(card).toContainText('Grant Fairbanks');
  const pending = page.waitForEvent('download');
  await card.getByRole('link', { name: 'Download file' }).click();
  expect((await pending).suggestedFilename()).toBe('rainbow-passage.txt');
});

test('hosted download points to the built offline package', async ({ page }) => {
  await page.goto('/dist/');
  const pending = page.waitForEvent('download');
  await page.getByRole('link', { name: /Download offline copy/ }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('paragraph-reader-2026-11-07.zip');
  await download.path();
});

test('failed example load keeps the current reading and notes', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Paste text').fill('A document already open.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.getByLabel('Note for current paragraph').fill('Keep this note.');
  await page.route('**/samples/rainbow-passage.txt', route => route.abort());
  await page.locator('[data-sample="rainbow-passage.txt"] button').evaluate(button => button.click());
  await expect(page.locator('#chunk-text')).toContainText('A document already open.');
  await expect(page.getByLabel('Note for current paragraph')).toHaveValue('Keep this note.');
});
