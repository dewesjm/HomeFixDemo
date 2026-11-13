/* NDT failure -> Repair -> Grind Only, on a joint with a blank XREFID (found by hull, drawing and joint). */
import { test, expect } from '@playwright/test';
import {
  ROOT_MTPT_JOINT, openJoint, expectRouting, signoffPanel, signAndConfirm, typeSelect, openHistory, jointDetail, routingPanel,
} from './support/joint-page';

test('an UNSAT NDT adds a Repair (Repair # 01); Grind Only sends the joint back to that NDT', async ({ page }) => {
  await openJoint(page, ROOT_MTPT_JOINT);
  await expectRouting(page, 'Root NDT MT/PT');
  await expect(await jointDetail(page, 'Repair #')).toHaveText('00');

  const panel = signoffPanel(page);
  /* Type first: changing Type clears the form */
  await typeSelect(page).selectOption({ label: 'PT' });
  await panel.getByRole('combobox', { name: 'Inner surface of the weld / ID is accessible*' }).selectOption('Yes');
  await panel.getByRole('combobox', { name: 'Procedure Used for Inspection*' }).selectOption({ label: 'ASTM E165' });
  await panel.getByRole('radio', { name: 'UNSAT' }).check();
  await signAndConfirm(page);

  await openJoint(page, ROOT_MTPT_JOINT);
  await expectRouting(page, 'Repair');
  await expect(routingPanel(page).getByText('Repair', { exact: true })).toBeVisible();
  await expect(await jointDetail(page, 'Repair #')).toHaveText('01');

  await signoffPanel(page).getByRole('combobox', { name: 'Repair Code*' }).selectOption({ label: 'Grind Only' });
  await signAndConfirm(page);

  await openJoint(page, ROOT_MTPT_JOINT);
  await expectRouting(page, 'Root NDT MT/PT');
  await expect(routingPanel(page).getByText('Repair', { exact: true })).toHaveCount(0);
  await expect(await jointDetail(page, 'Repair #')).toHaveText('01');

  await openHistory(page, ROOT_MTPT_JOINT);
  const history = page.locator('main');
  await expect(history).toContainText('Root NDT MT/PT - Signed off');
  await expect(history.locator('tr').filter({ hasText: 'Inspection Results' }).first()).toContainText('UNSAT');
  await expect(history).toContainText('Repair - Signed off');
  await expect(history.locator('tr').filter({ hasText: 'Repair Code' }).first()).toContainText('Grind Only');
  await expect(history).toContainText('Repair - Routed back to Root NDT MT/PT');

  await page.reload();
  await openJoint(page, ROOT_MTPT_JOINT);
  await expectRouting(page, 'Root NDT MT/PT');
  await expect(await jointDetail(page, 'Repair #')).toHaveText('01');
});
