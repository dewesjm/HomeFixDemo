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
