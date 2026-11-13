/* Helpers for joint page journeys. The joints below come from the deterministic seed data (data/jobs.ts and
   data/seeded-workflow.ts), so each one always starts at the routing named here in a fresh browser context.
   If the seed generator changes, find a replacement joint on Pipe Welding (Routing column) and update it. */
import { expect, type Locator, type Page } from '@playwright/test';

export interface SeededJoint { xrefid: string; hull: string; drawing: string; joint: string }

/* at Fit; Type offers Fit and Weld Build-Up; Fabrication filled in by the seed */
export const FIT_JOINT: SeededJoint = { xrefid: 'AQ53B', hull: 'S4949', drawing: 'H711-1235', joint: 'ST-10463' };
/* at Tack; Fabrication filled in, GWP/WTN assigned, PH/IP actuals blank */
export const TACK_JOINT: SeededJoint = { xrefid: 'G272M', hull: 'N1426', drawing: 'S753-0116', joint: 'HV-10890' };
/* at Root NDT MT/PT (Types PT and MT); blank XREFID, so it is found by hull, drawing and joint */
export const ROOT_MTPT_JOINT: SeededJoint = { xrefid: '', hull: 'S8371', drawing: 'S720-4518', joint: 'LO-10652' };

/* at Tack; the external system sends nothing, so GWP, WTN, Weld Process and PH/IP limits are typed in (engineering override) */
export const ENGINEERING_ENTRY_JOINT: SeededJoint = { xrefid: '8N43U', hull: 'S1622', drawing: 'H711-1234', joint: 'ST-10687' };

export const jointUrl = (j: SeededJoint) => `/jobs/${j.hull}/${j.drawing}/${j.joint}`;

export async function openJoint(page: Page, j: SeededJoint) {
  await page.goto(jointUrl(j));
  await expect(page.getByRole('heading', { name: 'Signoff' })).toBeVisible();
}

/* the "Routing: X" line at the top of the joint page */
export async function expectRouting(page: Page, routing: string) {
  await expect(page.locator('.page-header')).toContainText(`Routing: ${routing}`);
}

export const routingPanel = (page: Page) =>
  page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'Routing', exact: true }) });
export const signoffPanel = (page: Page) => page.locator('section.signoff-panel');
export const fabricationPanel = (page: Page) =>
  page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'Fabrication' }) });

/* a Fabrication field by its label, with or without the required star */
export const fabricationInput = (page: Page, label: string): Locator =>
  fabricationPanel(page).getByLabel(new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '\\*?$'));

/* Type is matched exactly so "Backing Ring Type" etc. don't match */
export const typeSelect = (page: Page) => signoffPanel(page).getByRole('combobox', { name: /^Type\*?$/ });

export async function fillAndLeave(field: Locator, value: string) {
  await field.fill(value);
  await field.blur();
}

/* presses Signoff and confirms with a password; the app goes back to Pipe Welding */
export async function signAndConfirm(page: Page) {
  await signoffPanel(page).getByRole('button', { name: 'Signoff' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Confirm sign-off' })).toBeVisible();
  const confirm = dialog.getByRole('button', { name: 'Signoff' });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('textbox', { name: 'Enter password to confirm' }).fill('demo');
  await confirm.click();
  await expect(page).toHaveURL(/\/pipe-welding$/);
}

/* finds the joint on Pipe Welding by its joint number and returns its row */
export async function pipeWeldingRow(page: Page, j: SeededJoint): Promise<Locator> {
  if (!page.url().endsWith('/pipe-welding')) await page.goto('/pipe-welding');
  await page.getByPlaceholder('Search XREFID, hull, drawing, joint or order…').fill(j.joint);
  const row = page.locator('tbody tr').filter({ hasText: j.joint }).filter({ hasText: j.hull });
  await expect(row).toHaveCount(1);
  return row;
}

/* opens the joint's History from its Pipe Welding row, every entry expanded */
export async function openHistory(page: Page, j: SeededJoint) {
  const row = await pipeWeldingRow(page, j);
  await row.getByRole('button', { name: 'History' }).click();
  await expect(page).toHaveURL(/\/history\?job=/);
  await page.getByRole('button', { name: 'Expand all' }).click();
}

/* a Joint details value under Show more, e.g. Repair # */
export async function jointDetail(page: Page, label: string): Promise<Locator> {
  const details = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'Joint details' }) });
  const more = details.getByRole('button', { name: 'Show more' });
  if (await more.isVisible()) await more.click();
  return details.locator('.detail-row').filter({ has: page.locator('.meta', { hasText: new RegExp(`^${label.replace(/[#]/g, '\\$&')}$`) }) }).locator('span').nth(1);
}

/* the shared confirm dialog (Deprogress, Engineering Override reason, ...): types the text and presses the accept button */
export async function answerConfirm(page: Page, header: string | RegExp, text: string, accept: string) {
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: header })).toBeVisible();
  const button = dialog.getByRole('button', { name: accept, exact: true });
  await expect(button).toBeDisabled();
  await dialog.getByRole('textbox').fill(text);
  await button.click();
  await expect(dialog).toHaveCount(0);
}
