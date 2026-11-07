import { test, expect } from '@playwright/test';

test('built app precaches the shell and all examples on its subpath', async ({ page, context }) => {
  await page.goto('/dist/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './manifest.webmanifest');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Paste text')).toBeVisible();
  await page.locator('[data-sample="lion-and-mouse.docx"]').getByRole('button', { name: 'Read example' }).click();
  await expect(page.locator('#chunk-text')).toContainText('Lion and the Mouse');
  await page.getByRole('button', { name: 'Utilities' }).click();
  await page.getByRole('button', { name: 'New document' }).click();
  await page.getByText('More examples').click();
  await page.locator('[data-sample="dutch-auctions.pdf"]').getByRole('button', { name: 'Read example' }).click();
  await expect(page.locator('#chunk-text')).toContainText('Going, going, gone', { timeout: 20000 });
});

test('install action gives usable guidance when no browser prompt is available', async ({ page }) => {
  await page.goto('/dist/');
  await page.getByRole('button', { name: 'Install on this device' }).click();
  await expect(page.locator('#install-guidance')).not.toBeEmpty();
});
