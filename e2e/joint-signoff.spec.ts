/* Normal signoff journeys on the joint page: validation blocks Signoff until fixed, the confirm dialog,
   the routing moving on, History, and the result surviving a reload. */
import { test, expect } from '@playwright/test';
import {
  FIT_JOINT, TACK_JOINT, openJoint, expectRouting, fabricationInput, fabricationPanel, fillAndLeave,
  signoffPanel, signAndConfirm, pipeWeldingRow, openHistory,
} from './support/joint-page';

test('Fit: a Fabrication error blocks Signoff until fixed, then the joint moves to Tack and stays there after a reload', async ({ page }) => {
  await openJoint(page, FIT_JOINT);
  await expectRouting(page, 'Fit');

  const thickness = fabricationInput(page, 'Actual Thickness');
  /* each Fabrication label is linked to its field */
  await fabricationPanel(page).locator('label', { hasText: 'Actual Thickness' }).click();
  await expect(thickness).toBeFocused();
  await fillAndLeave(thickness, '');
  await expect(fabricationPanel(page).locator('.field-error')).toHaveText(['Actual Thickness is required']);

  const panel = signoffPanel(page);
  await panel.getByRole('combobox', { name: 'Backing Ring Type*' }).selectOption({ label: 'Standard' });
  await fillAndLeave(panel.getByRole('textbox', { name: 'Backing Ring MIC*' }), '123A-4567-890-1');

  await panel.getByRole('button', { name: 'Signoff' }).click();
  await expect(panel.getByText('Fix the Fabrication fields marked in red')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await fillAndLeave(thickness, '0.5');
  await expect(page.locator('.field-error')).toHaveCount(0);
  await signAndConfirm(page);

  await expect(await pipeWeldingRow(page, FIT_JOINT)).toContainText('Tack');

  await openHistory(page, FIT_JOINT);
  const history = page.locator('main');
  await expect(history).toContainText('Fit - Signed off');
  await expect(history).toContainText('Backing Ring MIC');
  await expect(history).toContainText('123A-4567-890-1');
  await expect(history).toContainText('Fabrication: Actual Thickness');
  await expect(history).toContainText('0.375 → 0.5');

  await page.reload();
  await expect(page.locator('main')).toContainText('Fit - Signed off');
  await openJoint(page, FIT_JOINT);
  await expectRouting(page, 'Tack');
  await expect(fabricationInput(page, 'Actual Thickness')).toHaveValue('0.5');
});

test('Tack: required and out-of-order actuals show on their fields; Cancel in the confirm dialog signs nothing', async ({ page }) => {
  await openJoint(page, TACK_JOINT);
  await expectRouting(page, 'Tack');
  const panel = signoffPanel(page);

  await panel.getByRole('button', { name: 'Signoff' }).click();
  await expect(panel.locator('.field-error')).toHaveText([
    'Actual PH Min is required', 'Actual PH Max is required', 'Actual IP Min is required', 'Actual IP Max is required',
  ]);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual PH Min*' }), '300');
  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual PH Max*' }), '200');
  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual IP Min*' }), '100');
  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual IP Max*' }), '200');
  await panel.getByRole('button', { name: 'Signoff' }).click();
  await expect(panel.locator('.field-error')).toHaveText(['Actual PH Max is below Actual PH Min']);

  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual PH Min*' }), '100');
  await expect(panel.locator('.field-error')).toHaveCount(0);

  await panel.getByRole('button', { name: 'Signoff' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  await expectRouting(page, 'Tack');
  await expect(panel.getByRole('button', { name: 'Signoff' })).toBeEnabled();
});
