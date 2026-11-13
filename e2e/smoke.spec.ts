/* Smoke journeys: the app starts from its seed data, a joint opens from Pipe Welding, and saved
   browser data stays within one test. Full workflow journeys are test-coverage package 2. */
import { test, expect } from '@playwright/test';

test('Pipe Welding lists seeded joints', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/pipe-welding$/);
  await expect(page.getByRole('heading', { name: 'Pipe Welding' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Details' }).first()).toBeVisible();
});

test('Details opens the joint page for that row', async ({ page }) => {
  await page.goto('/pipe-welding');
  await page.getByRole('button', { name: 'Details' }).first().click();
  await expect(page).toHaveURL(/\/jobs\/[^/]+\/[^/]+\/[^/]+$/);
  await expect(page).toHaveTitle('EWR - Hull Details');
  await expect(page.getByText('Routing:')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Joint details' })).toBeVisible();
});

test.describe('storage isolation', () => {
  test('a test can write saved data', async ({ page }) => {
    await page.goto('/pipe-welding');
    await page.evaluate(() => localStorage.setItem('e2e-isolation-check', 'written'));
    expect(await page.evaluate(() => localStorage.getItem('e2e-isolation-check'))).toBe('written');
  });

  test('the next test starts without it', async ({ page }) => {
    await page.goto('/pipe-welding');
    expect(await page.evaluate(() => localStorage.getItem('e2e-isolation-check'))).toBeNull();
  });
});
