import { test, expect } from '@playwright/test';

// Covers docs/accessibility-audit-2026-11-17.md items 1, 8, 9 and 13.

async function openReading(page, text = 'First paragraph.\n\nSecond paragraph.') {
  await page.goto('/');
  await page.getByLabel('Paste text').fill(text);
  await page.getByRole('button', { name: 'Start reading' }).click();
  await expect(page.locator('#chunk-text')).toContainText('First paragraph.');
}

test('reaching the last chunk by keyboard does not drop focus to the body', async ({ page }) => {
  await openReading(page);
  await page.locator('#next').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#chunk-text')).toContainText('Second paragraph.');
  await expect(page.locator('#next')).toBeDisabled();
  const focused = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  expect(focused).not.toBe('BODY');
  await expect(page.locator('#previous')).toBeFocused();
});

test('reaching the first chunk by keyboard does not drop focus to the body', async ({ page }) => {
  await openReading(page);
  await page.locator('#next').focus();
  await page.keyboard.press('Enter');
  await page.locator('#previous').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#previous')).toBeDisabled();
  await expect(page.locator('#next')).toBeFocused();
});

test('the toast clears its text when it fades, so it leaves the accessibility tree', async ({ page }) => {
  await openReading(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Utilities' }).click();
  await page.getByRole('button', { name: 'Download notes' }).click();
  await download;
  await expect(page.locator('#toast')).toHaveText(/downloaded/);
  // The toast is hidden by opacity, not display, so stale text stays readable to a screen
  // reader unless it is cleared outright.
  await expect(page.locator('#toast')).toHaveText('', { timeout: 6000 });
});

test('visible labels match accessible names on the toolbar and word controls', async ({ page }) => {
  await openReading(page);
  await expect(page.locator('#unit')).toHaveAccessibleName('Read by');
  await page.getByRole('button', { name: 'Read words' }).click();
  await expect(page.locator('#word-speed')).toHaveAccessibleName(/^Speed/);
});

test('the word reader exposes the passage text, not only the flashing word', async ({ page }) => {
  await openReading(page, 'The quick brown fox. It jumped over.\n\nSecond paragraph here.');
  await page.getByRole('button', { name: 'Read words' }).click();
  await expect(page.locator('#word-text')).toHaveText('The quick brown fox.');
  await expect(page.locator('#word-display')).toHaveAttribute('aria-hidden', 'true');
});

test('position changes are announced and the entry screen is a landmark', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.locator('#setup')).toHaveRole('main');
  await page.getByLabel('Paste text').fill('First paragraph.\n\nSecond paragraph.');
  await page.getByRole('button', { name: 'Start reading' }).click();
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.locator('#progress')).toHaveRole('status');
  await expect(page.locator('#progress')).toHaveText('1 of 2 paragraphs');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('#progress')).toHaveText('2 of 2 paragraphs');
});

test('the notes toggle states itself through its label, not a contradictory pressed state', async ({ page }) => {
  await openReading(page);
  await expect(page.locator('#notes-toggle')).not.toHaveAttribute('aria-pressed');
  await expect(page.locator('#notes-toggle')).toHaveText('Hide notes');
  await page.getByRole('button', { name: 'Hide notes' }).click();
  await expect(page.locator('#notes-toggle')).toHaveText('Show notes');
});
