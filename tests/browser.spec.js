import { test, expect } from '@playwright/test';

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
