import { test, expect } from '@playwright/test';
import { FIT_JOINT, TACK_JOINT, jointUrl, fabricationInput, fillAndLeave, pipeWeldingRow, signAndConfirm, signoffPanel, typeSelect } from './support/joint-page';

test('View as and saved group personas determine Pipe Welding queues', async ({ page }) => {
  await page.goto('/pipe-welding');
  const role = page.getByRole('combobox', { name: 'Role', exact: true });
  await expect(role.locator('option:checked')).toHaveText('View All');

  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByLabel('View as').selectOption({ label: 'Bob (Fitter)' });
  await expect(role.locator('option')).toHaveText(['Fitting', 'View All']);
  await expect(role.locator('option:checked')).toHaveText('Fitting');

  await page.getByLabel('View as').selectOption({ label: 'Developer' });
  await page.goto('/admin/groups');
  const fitting = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Fitters who handle Fit.', exact: true }) });
  await fitting.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('checkbox', { name: 'Welding', exact: true }).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await page.goto('/pipe-welding');
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByLabel('View as').selectOption({ label: 'Bob (Fitter)' });
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
    localStorage.setItem('welding:admin-groups:v5', JSON.stringify([
      { id: 'g10', name: 'View', description: '', personas: [], allowed: ['view', 'joint-details', 'joint-history'] },
    ]));
  });
  await page.reload();
  await expect(page).toHaveURL(/\/pipe-welding$/);
  await page.goto(scopedHistory);
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
});

test('Fitter can sign Fit and read joint History, with separate Weld Build-Up access', async ({ page }) => {
  await page.goto('/pipe-welding');
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByLabel('View as').selectOption({ label: 'Bob (Fitter)' });
  await page.goto('/history');
  await expect(page).toHaveURL(/\/pipe-welding$/);
  await page.goto('/admin/groups');
  await expect(page).toHaveURL(/\/pipe-welding$/);

  const role = page.getByRole('combobox', { name: 'Role', exact: true });
  await role.selectOption({ label: 'View All' });
  const row = await pipeWeldingRow(page, FIT_JOINT);
  await row.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByRole('heading', { name: 'Joint details' })).toBeVisible();
  await expect(typeSelect(page).getByRole('option', { name: 'Weld Build-Up' })).toHaveAttribute('disabled', '');
  await fillAndLeave(fabricationInput(page, 'Actual Thickness'), '0.5');
  const panel = signoffPanel(page);
  await panel.getByRole('combobox', { name: 'Backing Ring Type*' }).selectOption({ label: 'Standard' });
  await fillAndLeave(panel.getByRole('textbox', { name: 'Backing Ring MIC*' }), '123A-4567-890-1');
  await signAndConfirm(page);

  await page.goto(jointUrl(FIT_JOINT));
  await expect(page.locator('.page-header')).toContainText('Routing: Tack');
  await expect(fabricationInput(page, 'Actual Thickness')).toHaveValue('0.5');
  await expect(panel.getByRole('button', { name: 'Signoff', exact: true })).toHaveCount(0);
  await page.goto('/pipe-welding');
  await role.selectOption({ label: 'View All' });
  await (await pipeWeldingRow(page, FIT_JOINT)).getByRole('button', { name: 'History' }).click();
  await expect(page).toHaveURL(/jointHistory=/);
  await expect(page.locator('main')).toContainText('Fit - Signed off');
  await expect(page.getByRole('button', { name: 'Deprogress' })).toHaveCount(0);
});

test('Welding can sign Weld Build-Up and Tack, with read-only History', async ({ page }) => {
  await page.goto('/pipe-welding');
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByLabel('View as').selectOption({ label: 'Jordan (Welder)' });
  await expect(page.getByRole('combobox', { name: 'Role', exact: true }).locator('option:checked')).toHaveText('Welding');

  await page.goto(jointUrl(FIT_JOINT));
  const panel = signoffPanel(page);
  const signoff = panel.getByRole('button', { name: 'Signoff', exact: true });
  await expect(signoff).toBeDisabled();
  await expect(typeSelect(page).getByRole('option', { name: 'Fit (permission required)', exact: true })).toHaveAttribute('disabled', '');
  await expect(fabricationInput(page, 'Actual Thickness')).toBeEditable();
  await typeSelect(page).selectOption({ label: 'Weld Build-Up' });
  await expect(signoff).toBeEnabled();

  await page.goto(jointUrl(TACK_JOINT));
  for (const [field, value] of [['Actual PH Min', '100'], ['Actual PH Max', '200'], ['Actual IP Min', '100'], ['Actual IP Max', '200']]) {
    await fillAndLeave(panel.getByRole('spinbutton', { name: `${field}*` }), value);
  }
  await signAndConfirm(page);
  await page.goto('/pipe-welding');
  await page.getByRole('combobox', { name: 'Role', exact: true }).selectOption({ label: 'View All' });
  await (await pipeWeldingRow(page, TACK_JOINT)).getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('button', { name: 'Deprogress', exact: true })).toBeDisabled();
  await expect(page.getByText('Requires Deprogress access.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Correct', exact: true }).first()).toBeDisabled();

  await page.goto('/admin/groups');
  await expect(page).toHaveURL(/\/pipe-welding$/);
  await page.goto('/makeup');
  await expect(page).toHaveURL(/\/pipe-welding$/);
});

test('a new Signoff Type generates a grant that can be saved and renamed', async ({ page }) => {
  await page.goto('/admin/signoff-types');
  await page.getByRole('button', { name: 'Add type' }).click();
  await page.getByPlaceholder('Name', { exact: true }).fill('Extra Fit Check');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await page.goto('/admin/groups');
  const fitting = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Fitting', exact: true }) });
  await fitting.getByRole('button', { name: 'Edit' }).click();
  const grant = fitting.getByRole('checkbox', { name: 'Sign Extra Fit Check', exact: true });
  await expect(grant).not.toBeChecked();
  await grant.check();
  await fitting.getByRole('button', { name: 'Save', exact: true }).click();

  await page.goto('/admin/signoff-types');
  await page.getByRole('row').filter({ hasText: 'Extra Fit Check' }).getByRole('button', { name: 'Edit' }).click();
  await page.getByPlaceholder('Name', { exact: true }).fill('Fit Review');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.goto('/admin/groups');
  await expect(fitting.getByText('Sign Fit Review', { exact: true })).toBeVisible();
});
