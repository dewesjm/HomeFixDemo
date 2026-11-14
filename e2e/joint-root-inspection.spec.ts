/* Root's inspection question: when NDT Root is 5X or VT, Root asks whether that inspection was performed and
   successful. Yes signs the phase's 5X/VT routing as SAT along with Root; No signs only Root. */
import { test, expect, type Page } from '@playwright/test';
import {
  ROOT_5X_JOINT, ROOT_VT_JOINT, openJoint, expectRouting, signoffPanel, signAndConfirm, fillAndLeave, openHistory, answerConfirm,
  type SeededJoint,
} from './support/joint-page';

const question = (page: Page, method: string) =>
  signoffPanel(page).getByRole('combobox', { name: `Did you perform ${method} inspection and was it successful?` });

/* fills Root's weld fields. The 5X joint is engineering-entry, so GWP, WTN, process and filler are typed in after an
   Engineering Override reason; the VT joint has them assigned and locked. */
async function fillRootWeld(page: Page) {
  const panel = signoffPanel(page);
  const gwp = panel.getByRole('textbox', { name: 'GWP*' });
  if (await gwp.count()) {
    await fillAndLeave(gwp, 'W-327');
    await answerConfirm(page, 'Engineering Override - Root', 'Procedure not yet loaded', 'Continue');
    await fillAndLeave(panel.getByRole('textbox', { name: 'WTN*' }), '06.1-1');
    await panel.getByRole('combobox', { name: /^Weld Process\*?$/ }).selectOption({ label: 'GTAW' });
    await fillAndLeave(panel.getByRole('textbox', { name: 'Filler Metal Type*' }), 'ER70S-2');
    await fillAndLeave(panel.getByRole('textbox', { name: 'Filler Metal Size*' }), '3/32');
  }
  await fillAndLeave(panel.getByRole('textbox', { name: 'Filler Metal MIC*' }), '123A-4567-890-1');
  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual PH Min*' }), '100');
  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual PH Max*' }), '200');
  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual IP Min*' }), '100');
  await fillAndLeave(panel.getByRole('spinbutton', { name: 'Actual IP Max*' }), '200');
  /* shown on the VT joint only */
  const position = panel.getByRole('combobox', { name: 'Weld Position*' });
  if (await position.count()) await position.selectOption({ label: 'F - Flat' });
}

async function signRoot(page: Page, j: SeededJoint, method: '5X' | 'VT', answer: 'Yes' | 'No') {
  await openJoint(page, j);
  await expectRouting(page, 'Root');
  await fillRootWeld(page);
  await expect(question(page, method).locator('option')).toHaveText(
    [`No I didn't perform ${method}`, `Yes I performed ${method} and it was successful`]);
  await question(page, method).selectOption({ label: answer === 'Yes' ? `Yes I performed ${method} and it was successful` : `No I didn't perform ${method}` });
  await signAndConfirm(page);
  await openJoint(page, j);
}

test('NDT Root 5X: answering Yes signs Root NDT 5X/VT as 5X SAT with Root, so the joint goes on to Layer', async ({ page }) => {
  await signRoot(page, ROOT_5X_JOINT, '5X', 'Yes');
  await expectRouting(page, 'Layer');

  await openHistory(page, ROOT_5X_JOINT);
  const history = page.locator('main');
  await expect(history).toContainText('Root - Signed off');
  const inspection = history.locator('tr').filter({ hasText: 'Root NDT 5X/VT - Signed off' });
  await expect(inspection).toHaveCount(1);
  await expect(inspection).toContainText('SAT');

  await page.reload();
  await openJoint(page, ROOT_5X_JOINT);
  await expectRouting(page, 'Layer');
});

test('NDT Root VT: the question names VT; answering No signs only Root, leaving Root NDT 5X/VT to sign', async ({ page }) => {
  await signRoot(page, ROOT_VT_JOINT, 'VT', 'No');
  await expectRouting(page, 'Root NDT 5X/VT');

  await openHistory(page, ROOT_VT_JOINT);
  const history = page.locator('main');
  await expect(history).toContainText('Root - Signed off');
  await expect(history.locator('tr').filter({ hasText: 'Root NDT 5X/VT - Signed off' })).toHaveCount(0);
});
