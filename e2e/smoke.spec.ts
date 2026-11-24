/* Smoke journeys: the app starts from its seed data, a joint opens from Pipe Welding and Structural, and saved
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

test('Structural Details opens the joint page, and Back returns to Structural', async ({ page }) => {
  await page.goto('/structural-welding');
  await page.getByRole('button', { name: 'Details' }).first().click();
  await expect(page).toHaveURL(/\/structural\/[^/]+\/[^/]+\/[^/]+$/);
  await expect(page.locator('strong', { hasText: 'Routing:' }).locator('..')).toContainText('Routing: Fit');
  await expect(page.getByRole('heading', { name: 'Joint details' })).toBeVisible();
  await page.locator('.back-link').click();
  await expect(page).toHaveURL(/\/structural-welding$/);
});

test('Routing Settings: the Joint type select opens Structural’s table, and Back returns to Pipe’s', async ({ page }) => {
  await page.goto('/admin/routing-settings');
  const select = page.getByLabel('Joint type');
  await expect(select).toHaveValue('pipe');
  await expect(select.locator('option', { hasText: 'Non-Numbered' })).toHaveAttribute('disabled');
  const pipeRows = await page.locator('tbody tr').count();
  expect(pipeRows).toBeGreaterThan(0);
  await select.selectOption('structural');
  await expect(page).toHaveURL(/\/admin\/routing-settings\?type=structural$/);
  await expect(page.getByLabel('Joint type')).toHaveValue('structural');
  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/routing-settings$/);
  await expect(page.getByLabel('Joint type')).toHaveValue('pipe');
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
