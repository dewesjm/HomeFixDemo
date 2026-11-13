/* Engineering journeys: a deviation accepted at signoff puts the joint on Engineering Hold until Engineering
   releases it; and the engineering override on a joint the external system sends no GWP/WTN for. */
import { test, expect } from '@playwright/test';
import {
  TACK_JOINT, ENGINEERING_ENTRY_JOINT, openJoint, expectRouting, signoffPanel, signAndConfirm, fillAndLeave,
  openHistory, answerConfirm, routingPanel,
} from './support/joint-page';

test('Tack with Actual PH Max over the limit: accepted as a deviation, held for Engineering, then released', async ({ page }) => {
  await openJoint(page, TACK_JOINT);
  const panel = signoffPanel(page);
  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual PH Min*' }), '100');
  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual PH Max*' }), '400');
  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual IP Min*' }), '100');
  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual IP Max*' }), '200');
  await panel.getByRole('button', { name: 'Signoff' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Accept deviations - Tack' })).toBeVisible();
  const item = dialog.locator('tbody tr');
  await expect(item).toHaveCount(1);
  await expect(item).toContainText('Actual PH Max');
  await expect(item).toContainText('400');
  await expect(item).toContainText('350');
  const accept = dialog.getByRole('button', { name: 'Accept and sign' });
  await dialog.getByPlaceholder('Enter password to confirm').fill('demo');
  await expect(accept).toBeDisabled();
  await dialog.getByPlaceholder('Why the work was done this way').fill('Torch preheat ran hot');
  await accept.click();
  await expect(page).toHaveURL(/\/pipe-welding$/);

  await openJoint(page, TACK_JOINT);
  await expectRouting(page, 'Engineering Hold');
  await expect(routingPanel(page).getByText('Engineering Hold', { exact: true })).toBeVisible();
  /* the banner says why; the release form shows the deviation */
  const hold = signoffPanel(page);
  await expect(hold.locator('.alert-warning')).toContainText('a deviation was accepted at Tack on');
  await expect(hold.locator('.alert-warning')).toContainText('No later routing can be signed until Engineering sets the routing on Engineering Hold.');
  await expect(hold).toContainText('Deviation at Tack');
  await expect(hold).toContainText('Torch preheat ran hot');

  /* Comments are required */
  await hold.getByRole('button', { name: 'Signoff' }).click();
  await expect(hold.getByText('Comments are required.')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await hold.getByRole('textbox', { name: /^Comments/ }).fill('Accepted, within material limits');
  const routeTo = hold.getByRole('combobox', { name: /^Set routing to/ });
  await expect(routeTo.locator('option:checked')).toHaveText('Fit-Up Insp');
  await signAndConfirm(page);

  await openJoint(page, TACK_JOINT);
  await expectRouting(page, 'Fit-Up Insp');
  await expect(signoffPanel(page).locator('.alert-warning')).toHaveCount(0);
  await expect(signoffPanel(page).getByRole('button', { name: 'Signoff' })).toBeEnabled();

  await openHistory(page, TACK_JOINT);
  const history = page.locator('main');
  await expect(history).toContainText('Deviation created');
  await expect(history).toContainText('Torch preheat ran hot');
  await expect(history).toContainText('Deviation dispositioned');
  await expect(history).toContainText('Accepted, within material limits');

  await page.reload();
  await expect(page.locator('main')).toContainText('Deviation dispositioned');
  await openJoint(page, TACK_JOINT);
  await expectRouting(page, 'Fit-Up Insp');
});

test('Engineering override: a typed GWP asks for a reason, is kept on leaving, locks, and reopens with a new reason', async ({ page }) => {
  await openJoint(page, ENGINEERING_ENTRY_JOINT);
  await expectRouting(page, 'Tack');
  const panel = signoffPanel(page);
  const gwp = panel.getByRole('textbox', { name: 'GWP*' });
  await expect(gwp).toHaveValue('');

  /* Cancel takes the value back out */
  await fillAndLeave(gwp, 'W-900');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Engineering Override - Tack' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(gwp).toHaveValue('');

  await fillAndLeave(gwp, 'W-900');
  await answerConfirm(page, 'Engineering Override - Tack', 'Procedure not yet loaded', 'Continue');
  /* once the reason is given, more values go in without asking again */
  await fillAndLeave(panel.getByRole('textbox', { name: 'WTN*' }), '99.1-1');
  await expect(dialog).toHaveCount(0);

  /* engineering values aren't an unsigned edit: Back leaves without asking */
  await page.getByText('← Back').click();
  await expect(page).toHaveURL(/\/pipe-welding$/);
  await expect(dialog).toHaveCount(0);

  await openJoint(page, ENGINEERING_ENTRY_JOINT);
  await expect(gwp).toHaveValue('W-900');
  await expect(gwp).toBeDisabled();
  await expect(panel.getByRole('textbox', { name: 'WTN*' })).toHaveValue('99.1-1');

  await panel.getByRole('button', { name: 'Engineering Override' }).click();
  await answerConfirm(page, 'Engineering Override - Tack', 'Revision B issued', 'Continue');
  await expect(gwp).toBeEnabled();
  await fillAndLeave(gwp, 'W-901');
  await page.getByText('← Back').click();
  await expect(page).toHaveURL(/\/pipe-welding$/);

  await openHistory(page, ENGINEERING_ENTRY_JOINT);
  const history = page.locator('main');
  await expect(history.locator('tr').filter({ hasText: 'Engineering Override' })).toHaveCount(2);
  await expect(history).toContainText('Procedure not yet loaded');
  await expect(history).toContainText('Revision B issued');
  await expect(history).toContainText('W-901');

  await page.reload();
  await openJoint(page, ENGINEERING_ENTRY_JOINT);
  await expect(gwp).toHaveValue('W-901');
  await expect(gwp).toBeDisabled();
});
