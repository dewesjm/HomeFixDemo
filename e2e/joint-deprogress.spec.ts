/* Deprogress from History: reverses the joint's most recent signoff and everything it did (here the Repair an
   UNSAT added and Repair #), needs a reason, and keeps every History entry. */
import { test, expect } from '@playwright/test';
import {
  ROOT_MTPT_JOINT, openJoint, expectRouting, signoffPanel, signAndConfirm, typeSelect, openHistory, jointDetail,
  routingPanel, answerConfirm, fabricationInput, signInspectionOn, signRepairOn, deprogressFromHistory, deprogressRow,
} from './support/joint-page';

test('Deprogress an UNSAT NDT: the Repair goes, Repair # is back to 00 and the NDT can be signed again', async ({ page }) => {
  await openJoint(page, ROOT_MTPT_JOINT);
  await typeSelect(page).selectOption({ label: 'PT' });
  const panel = signoffPanel(page);
  await panel.getByRole('combobox', { name: 'Inner surface of the weld / ID is accessible*' }).selectOption('Yes');
  await panel.getByRole('combobox', { name: 'Procedure Used for Inspection*' }).selectOption({ label: 'ASTM E165' });
  await panel.getByRole('radio', { name: 'UNSAT' }).check();
  await signAndConfirm(page);

  await openJoint(page, ROOT_MTPT_JOINT);
  await expectRouting(page, 'Repair');
  await expect(await jointDetail(page, 'Repair #')).toHaveText('01');

  await openHistory(page, ROOT_MTPT_JOINT);
  const deprogress = page.locator('main').getByRole('button', { name: 'Deprogress' });
  /* only the most recent signoff offers it */
  await expect(deprogress).toHaveCount(1);
  await expect(page.locator('main tr').filter({ has: page.getByRole('button', { name: 'Deprogress' }) })).toContainText('Root NDT MT/PT - Signed off');

  /* Cancel reverses nothing */
  await deprogress.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(deprogress).toHaveCount(1);

  await deprogress.click();
  await answerConfirm(page, 'Deprogress', 'Wrong method recorded', 'Deprogress');

  const history = page.locator('main');
  await expect(history).toContainText('Wrong method recorded');
  /* the reversed signoff stays on record */
  await expect(history).toContainText('Root NDT MT/PT - Signed off');

  await openJoint(page, ROOT_MTPT_JOINT);
  await expectRouting(page, 'Root NDT MT/PT');
  await expect(routingPanel(page).getByText('Repair', { exact: true })).toHaveCount(0);
  await expect(await jointDetail(page, 'Repair #')).toHaveText('00');
  /* the form comes up blank */
  await expect(typeSelect(page).locator('option:checked')).toHaveText(/^Select the inspection performed/);

  await page.reload();
  await expectRouting(page, 'Root NDT MT/PT');
  await expect(await jointDetail(page, 'Repair #')).toHaveText('00');

  await typeSelect(page).selectOption({ label: 'PT' });
  await panel.getByRole('combobox', { name: 'Inner surface of the weld / ID is accessible*' }).selectOption('Yes');
  await panel.getByRole('combobox', { name: 'Procedure Used for Inspection*' }).selectOption({ label: 'ASTM E165' });
  await panel.getByRole('radio', { name: 'SAT', exact: true }).check();
  await signAndConfirm(page);
  await openJoint(page, ROOT_MTPT_JOINT);
  await expectRouting(page, 'Layer');
  await expect(await jointDetail(page, 'Repair #')).toHaveText('00');
});

test('Deprogress of a Cut brings back the Repair, fit-up data and Refit # 00; a second Deprogress takes back the UNSAT', async ({ page }) => {
  await openJoint(page, ROOT_MTPT_JOINT);
  const thickness = await fabricationInput(page, 'Actual Thickness').inputValue();
  expect(thickness).not.toBe('');

  await signInspectionOn(page, ROOT_MTPT_JOINT, 'MT', 'UNSAT');
  await signRepairOn(page, ROOT_MTPT_JOINT, 'Cut');
  await expectRouting(page, 'Fit');
  await expect(await jointDetail(page, 'Refit #')).toHaveText('01');
  await expect(fabricationInput(page, 'Actual Thickness')).toHaveValue('');

  await openHistory(page, ROOT_MTPT_JOINT);
  await expect(deprogressRow(page)).toContainText('Repair - Signed off');
  await deprogressFromHistory(page, 'Not a cut, grind it');
  /* the next one back is offered now */
  await expect(deprogressRow(page)).toContainText('Root NDT MT/PT - Signed off');
  await expect(page.locator('main')).toContainText(/Cut . routed back to Fit/i);

  await openJoint(page, ROOT_MTPT_JOINT);
  await expectRouting(page, 'Repair');
  await expect(await jointDetail(page, 'Refit #')).toHaveText('00');
  await expect(await jointDetail(page, 'Repair #')).toHaveText('01');
  await expect(fabricationInput(page, 'Actual Thickness')).toHaveValue(thickness);
  /* the Repair comes up blank */
  await expect(signoffPanel(page).getByRole('combobox', { name: 'Repair Code*' })).toHaveValue('');

  await page.reload();
  await expectRouting(page, 'Repair');
  await expect(await jointDetail(page, 'Refit #')).toHaveText('00');

  await openHistory(page, ROOT_MTPT_JOINT);
  await deprogressFromHistory(page, 'MT reading was wrong');
  await openJoint(page, ROOT_MTPT_JOINT);
  await expectRouting(page, 'Root NDT MT/PT');
  await expect(routingPanel(page).getByText('Repair', { exact: true })).toHaveCount(0);
  await expect(await jointDetail(page, 'Repair #')).toHaveText('00');
  await expect(fabricationInput(page, 'Actual Thickness')).toHaveValue(thickness);
});
