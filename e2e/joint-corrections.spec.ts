/* History's Correct (fix a value recorded at a signoff without moving the joint) and References (file names
   recorded on the joint, from the signoff form or the Correct window). */
import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  ROOT_RT_JOINT, openJoint, expectRouting, signoffPanel, signAndConfirm, typeSelect, openHistory,
} from './support/joint-page';

/* on History: the Correct button on this routing's latest signoff row */
async function openCorrect(page: Page, routing: string): Promise<Locator> {
  const row = page.locator('main tr').filter({ has: page.getByRole('button', { name: 'Correct' }) }).filter({ hasText: routing });
  await row.first().getByRole('button', { name: 'Correct' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: `Correct sign-off - ${routing}` })).toBeVisible();
  return dialog;
}

/* a locked Correct window value (shown as text, not a field) with its label and Locked note */
const lockedField = (dialog: Locator, label: string) =>
  dialog.locator('div.w-full').filter({ has: dialog.page().getByText(label, { exact: true }) });

const referencesPanel = (scope: Locator) => scope.locator('section').filter({ has: scope.page().getByRole('heading', { name: 'References' }) });

async function addReference(scope: Locator, name: string) {
  await referencesPanel(scope).locator('input[type=file]').setInputFiles({ name, mimeType: 'application/pdf', buffer: Buffer.from('demo') });
  await expect(referencesPanel(scope).locator('tbody tr').filter({ hasText: name })).toHaveCount(1);
}

test('Correct changes a recorded Weld Color with a reason, leaves the routing alone, and History shows old → new', async ({ page }) => {
  await openJoint(page, ROOT_RT_JOINT);
  await expectRouting(page, 'Root NDT RT/UT');

  await openHistory(page, ROOT_RT_JOINT);
  const dialog = await openCorrect(page, 'Root NDT 5X/VT');
  const save = dialog.getByRole('button', { name: 'Save correction' });
  const color = dialog.getByLabel('Weld Color', { exact: true });
  await expect(color.locator('option:checked')).toHaveText('Shiny Silver');
  await expect(save).toBeDisabled();

  /* each Correct label is linked to its field */
  await dialog.locator('label', { hasText: 'Weld Color' }).click();
  await expect(color).toBeFocused();

  await color.selectOption({ label: 'Straw' });
  /* a reason is required */
  await expect(save).toBeDisabled();
  await dialog.getByLabel('Reason for correction').fill('Wrong color picked');
  await save.click();
  await expect(dialog).toHaveCount(0);

  /* the new entry comes in collapsed; its details are checked after the reload, where every entry is expanded */
  const correction = page.locator('main tr').filter({ hasText: 'Root NDT 5X/VT - Corrected Weld Color' });
  await expect(correction).toHaveCount(1);
  /* a correction is its own entry: Deprogress and Correct stay on the signoff row */
  await expect(correction.getByRole('button', { name: 'Deprogress' })).toHaveCount(0);
  await expect(correction.getByRole('button', { name: 'Correct' })).toHaveCount(0);
  const deprogressRow = page.locator('main tr').filter({ has: page.getByRole('button', { name: 'Deprogress' }) });
  await expect(deprogressRow).toHaveCount(1);
  await expect(deprogressRow).toContainText('Root NDT 5X/VT');
  await expect(deprogressRow).not.toContainText('Corrected');

  /* the correction doesn't move the joint */
  await openJoint(page, ROOT_RT_JOINT);
  await expectRouting(page, 'Root NDT RT/UT');

  await page.reload();
  await openHistory(page, ROOT_RT_JOINT);
  const history = page.locator('main');
  await expect(history.locator('tr').filter({ hasText: 'Root NDT 5X/VT - Corrected Weld Color' })).toHaveCount(1);
  await expect(history).toContainText('Wrong color picked');
  await expect(history).toContainText('Shiny Silver → Straw');
  const again = await openCorrect(page, 'Root NDT 5X/VT');
  await expect(again.getByLabel('Weld Color', { exact: true }).locator('option:checked')).toHaveText('Straw');
});

test('Correct shows a value that drove routing as locked: Fit-Up Insp\'s Release to welding', async ({ page }) => {
  await openHistory(page, ROOT_RT_JOINT);
  const dialog = await openCorrect(page, 'Fit-Up Insp');
  const release = lockedField(dialog, 'Release to welding upon inspection');
  await expect(release).toContainText('yes');
  await expect(release).toContainText('Locked - this value drove routing when the routing was signed.');
  await expect(release.locator('input, select')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
});

test('References: added and removed on the RT form, kept through signoff and reload, and listed in Correct', async ({ page }) => {
  await openJoint(page, ROOT_RT_JOINT);
  const panel = signoffPanel(page);
  await typeSelect(page).selectOption({ label: 'RT' });
  await expect(referencesPanel(panel)).toContainText('No references yet.');

  await addReference(panel, 'rt-film-01.pdf');
  await addReference(panel, 'rt-film-02.pdf');
  await referencesPanel(panel).getByRole('button', { name: 'Remove rt-film-01.pdf' }).click();
  await expect(referencesPanel(panel).locator('tbody tr')).toHaveCount(1);
  await expect(referencesPanel(panel)).toContainText('rt-film-02.pdf');

  await panel.getByRole('combobox', { name: 'Procedure Used for Inspection*' }).selectOption({ label: 'ASTM E1032' });
  await panel.getByRole('combobox', { name: /^Degree of RT Performed/ }).selectOption('60');
  await panel.getByRole('radio', { name: 'SAT', exact: true }).check();
  await signAndConfirm(page);

  await openJoint(page, ROOT_RT_JOINT);
  await expectRouting(page, 'Layer');

  await openHistory(page, ROOT_RT_JOINT);
  const history = page.locator('main');
  await expect(history).toContainText('Root NDT RT/UT - Signed off');
  await expect(history.locator('tr').filter({ hasText: 'Reference added' })).toHaveCount(2);
  await expect(history.locator('tr').filter({ hasText: 'Reference removed' })).toHaveCount(1);

  await page.reload();
  await openHistory(page, ROOT_RT_JOINT);
  const dialog = await openCorrect(page, 'Root NDT RT/UT');
  await expect(referencesPanel(dialog).locator('tbody tr')).toHaveCount(1);
  await expect(referencesPanel(dialog)).toContainText('rt-film-02.pdf');
  /* a reference added from Correct is recorded straight away */
  await addReference(dialog, 'rt-film-03.pdf');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('main tr').filter({ hasText: 'Reference added' })).toHaveCount(3);
});
