/* NDT failure -> Repair, then Grind Only, Cut or Weld Repair -> Excavation NDT, on a joint with a blank XREFID
   (found by hull, drawing and joint). Its base metals are non-ferrous, so a failed PT gets a 5X Excavation NDT. */
import { test, expect, type Page } from '@playwright/test';
import {
  ROOT_MTPT_JOINT, openJoint, expectRouting, signoffPanel, signAndConfirm, typeSelect, openHistory, jointDetail, routingPanel,
  fabricationInput, signInspectionOn, signRepairOn,
} from './support/joint-page';

const signInspection = (page: Page, type: 'MT' | 'PT' | '5X', result: 'SAT' | 'UNSAT') =>
  signInspectionOn(page, ROOT_MTPT_JOINT, type, result);
const signRepair = (page: Page, code: 'Grind Only' | 'Weld Repair' | 'Cut') => signRepairOn(page, ROOT_MTPT_JOINT, code);

const dot = (page: Page, name: string) => routingPanel(page).getByText(name, { exact: true });

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

test('Weld Repair adds Excavation NDT for the failed method; UNSAT goes back to the same Repair, SAT to the failed NDT', async ({ page }) => {
  await openJoint(page, ROOT_MTPT_JOINT);
  await signInspection(page, 'MT', 'UNSAT');
  await expectRouting(page, 'Repair');
  await signRepair(page, 'Weld Repair');

  await expectRouting(page, 'NQC Excavation NDT');
  await expect(dot(page, 'Repair')).toBeVisible();
  /* only the method that failed is offered */
  await expect(typeSelect(page).locator('option')).toHaveText(['Select the inspection performed…', 'MT']);
  await signInspection(page, 'MT', 'UNSAT');

  /* back to its own Repair, blank; no new Repair round */
  await expectRouting(page, 'Repair');
  await expect(await jointDetail(page, 'Repair #')).toHaveText('01');
  const code = signoffPanel(page).getByRole('combobox', { name: 'Repair Code*' });
  await expect.poll(() => code.evaluate((e: HTMLSelectElement) => e.selectedOptions[0]?.text ?? '')).toBe('');
  await signRepair(page, 'Weld Repair');

  await expectRouting(page, 'NQC Excavation NDT');
  await signInspection(page, 'MT', 'SAT');
  await expectRouting(page, 'Root NDT MT/PT');
  await expect(dot(page, 'Repair')).toHaveCount(0);
  await expect(await jointDetail(page, 'Repair #')).toHaveText('01');

  await openHistory(page, ROOT_MTPT_JOINT);
  const history = page.locator('main');
  await expect(history.locator('tr').filter({ hasText: 'Excavation NDT - Signed off' })).toHaveCount(2);
  await expect(history.locator('tr').filter({ hasText: 'Repair - Signed off' })).toHaveCount(2);

  await page.reload();
  await openJoint(page, ROOT_MTPT_JOINT);
  await expectRouting(page, 'Root NDT MT/PT');
});

test('a failed PT on non-ferrous base metals gets a 5X Excavation NDT; SAT goes to Root NDT 5X/VT allowing 5X', async ({ page }) => {
  await openJoint(page, ROOT_MTPT_JOINT);
  await signInspection(page, 'PT', 'UNSAT');
  await signRepair(page, 'Weld Repair');
  await expectRouting(page, 'NQC Excavation NDT');
  await expect(typeSelect(page).locator('option')).toHaveText(['Select the inspection performed…', '5X']);
  await signInspection(page, '5X', 'SAT');

  /* the phase's 5X/VT routing (signed before) comes up blank, offering 5X as well as VT */
  await expectRouting(page, 'Root NDT 5X/VT');
  await expect(typeSelect(page).locator('option')).toContainText(['5X']);
  await expect(dot(page, 'Repair')).toHaveCount(0);
});

test('Cut sends the joint back to Fit with blank fit-up data and Refit # 01', async ({ page }) => {
  await openJoint(page, ROOT_MTPT_JOINT);
  await expect(await jointDetail(page, 'Refit #')).toHaveText('00');
  const thickness = await fabricationInput(page, 'Actual Thickness').inputValue();
  expect(thickness).not.toBe('');

  await signInspection(page, 'MT', 'UNSAT');
  await signRepair(page, 'Cut');

  await expectRouting(page, 'Fit');
  await expect(await jointDetail(page, 'Refit #')).toHaveText('01');
  await expect(await jointDetail(page, 'Repair #')).toHaveText('01');
  await expect(fabricationInput(page, 'Actual Thickness')).toHaveValue('');
  await expect(dot(page, 'Repair')).toHaveCount(0);

  await openHistory(page, ROOT_MTPT_JOINT);
  const history = page.locator('main');
  await expect(history).toContainText('Repair - Signed off');
  await expect(history).toContainText(/Cut . routed back to Fit/i);
  await expect(history).toContainText('Fabrication before the Cut');
  await expect(history).toContainText(thickness);
  /* earlier signoffs stay on record */
  await expect(history).toContainText('Root NDT MT/PT - Signed off');

  await page.reload();
  await openJoint(page, ROOT_MTPT_JOINT);
  await expectRouting(page, 'Fit');
  await expect(await jointDetail(page, 'Refit #')).toHaveText('01');
});
