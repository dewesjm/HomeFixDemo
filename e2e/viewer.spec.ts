import { test, expect } from '@playwright/test';

test('View as and saved group personas determine Pipe Welding queues', async ({ page }) => {
  await page.goto('/pipe-welding');
  const role = page.getByRole('combobox', { name: 'Role', exact: true });
  await expect(role.locator('option:checked')).toHaveText('View All');

  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByLabel('View as').selectOption({ label: 'Bob (Fitter)' });
  await expect(role.locator('option')).toHaveText(['Fitting', 'View All']);
  await expect(role.locator('option:checked')).toHaveText('Fitting');

  await page.goto('/admin/groups');
  const fitting = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Fitters who handle Fit.', exact: true }) });
  await fitting.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('checkbox', { name: 'Welding', exact: true }).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await page.goto('/pipe-welding');
  await expect(role.locator('option')).toHaveText(['Fitting', 'Welding', 'View All']);
  await expect(role.locator('option:checked')).toHaveText('Fitting');
});

test('Developer and Administrator share queues while Services requires Developer', async ({ page }) => {
  await page.goto('/admin/services');
  const tester = page.locator('app-service-tester-panel');
  await expect(tester).toBeVisible();

  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByLabel('View as').selectOption({ label: 'Alex (Administrator)' });
  await expect(tester).toHaveCount(0);
  await page.goto('/admin/services');
  await expect(page).toHaveURL(/\/pipe-welding$/);
  const role = page.getByRole('combobox', { name: 'Role', exact: true });
  await expect(role.locator('option')).toHaveCount(9);
  await expect(role.locator('option:checked')).toHaveText('View All');

  await page.goto('/admin/groups');
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();
  const group = (name: string) =>
    page.getByRole('row').filter({ has: page.getByRole('cell', { name, exact: true }) });
  await expect(group('Developer').getByText('API access', { exact: true })).toBeVisible();
  await expect(group('Administrators').getByText('API access', { exact: true })).toHaveCount(0);
});

test('View can read joints and use each History permission independently', async ({ page }) => {
  await page.goto('/pipe-welding');
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByLabel('View as').selectOption({ label: 'Casey (View)' });
  await page.getByRole('button', { name: 'User menu' }).click();

  await page.getByRole('button', { name: 'Details' }).first().click();
  await expect(page.getByRole('heading', { name: 'Joint details' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Signoff', exact: true })).toHaveCount(0);

  await page.goto('/admin/groups');
  await expect(page).toHaveURL(/\/pipe-welding$/);
  await page.getByRole('button', { name: 'History' }).first().click();
  await expect(page).toHaveURL(/jointHistory=/);
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deprogress', exact: true })).toHaveCount(0);
  const scopedHistory = page.url();

  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  // Use the same persisted group rows that the in-app editor writes.
  await page.evaluate(() => {
    localStorage.setItem('welding:admin-groups:v2', JSON.stringify([
      { id: 'g10', name: 'View', description: '', personas: [], allowed: ['view', 'joint-details', 'joint-history'] },
    ]));
  });
  await page.reload();
  await expect(page).toHaveURL(/\/pipe-welding$/);
  await page.goto(scopedHistory);
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
});
