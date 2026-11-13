/* Type changes and leaving the joint page with edits that were never signed. */
import { test, expect } from '@playwright/test';
import { FIT_JOINT, openJoint, expectRouting, fillAndLeave, signoffPanel, typeSelect } from './support/joint-page';

test('changing Type clears what was entered and loads the new Type\'s form', async ({ page }) => {
  await openJoint(page, FIT_JOINT);
  const panel = signoffPanel(page);
  const mic = panel.getByRole('textbox', { name: 'Backing Ring MIC*' });
  await fillAndLeave(mic, '123A-4567-890-1');

  await typeSelect(page).selectOption({ label: 'Weld Build-Up' });
  await expect(mic).toHaveCount(0);
  await expect(panel.getByText('Affected Item*')).toBeVisible();
  await expect(panel.getByRole('spinbutton', { name: 'Actual PH Min*' })).toBeVisible();

  await typeSelect(page).selectOption({ label: 'Fit' });
  await expect(panel.getByRole('textbox', { name: 'Backing Ring MIC*' })).toHaveValue('');
  await expect(panel.getByText('Affected Item*')).toHaveCount(0);
});

test('leaving with unsigned edits: Stay keeps them, Leave discards them', async ({ page }) => {
  await openJoint(page, FIT_JOINT);
  const mic = signoffPanel(page).getByRole('textbox', { name: 'Backing Ring MIC*' });
  await fillAndLeave(mic, '123A-4567-890-1');

  await page.getByText('← Back').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Unsaved changes' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Stay' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/jobs\//);
  await expect(mic).toHaveValue('123A-4567-890-1');

  await page.getByText('← Back').click();
  await dialog.getByRole('button', { name: 'Leave' }).click();
  await expect(page).toHaveURL(/\/pipe-welding$/);

  await openJoint(page, FIT_JOINT);
  await expectRouting(page, 'Fit');
  await expect(signoffPanel(page).getByRole('textbox', { name: 'Backing Ring MIC*' })).toHaveValue('');
});

test('leaving without edits asks nothing', async ({ page }) => {
  await openJoint(page, FIT_JOINT);
  await page.getByText('← Back').click();
  await expect(page).toHaveURL(/\/pipe-welding$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('reloading with unsigned edits shows the browser leave warning; without edits there is none', async ({ page }) => {
  const warnings: string[] = [];
  page.on('dialog', d => { warnings.push(d.type()); void d.accept(); });

  await openJoint(page, FIT_JOINT);
  await page.reload();
  expect(warnings).toEqual([]);

  await fillAndLeave(signoffPanel(page).getByRole('textbox', { name: 'Backing Ring MIC*' }), '123A-4567-890-1');
  await page.reload();
  expect(warnings).toEqual(['beforeunload']);
  /* going ahead keeps the edit: it was saved as it was typed */
  await expect(signoffPanel(page).getByRole('textbox', { name: 'Backing Ring MIC*' })).toHaveValue('123A-4567-890-1');
});
