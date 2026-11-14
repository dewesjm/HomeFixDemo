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

/* at Root; NDT Root 5X, RT Degree Root NA, so Root NDT 5X/VT is its only Root inspection; engineering-entry (GWP etc. typed in) */
export const ROOT_5X_JOINT: SeededJoint = { xrefid: 'FY636', hull: 'S5145', drawing: 'H711-1235', joint: 'ST-11464' };
/* at Root; NDT Root VT, Nuclear Indicator 1 (NQC rows) */
export const ROOT_VT_JOINT: SeededJoint = { xrefid: 'FTERM', hull: 'S4949', drawing: 'S720-4518', joint: 'LO-10386' };
/* at Root NDT RT/UT offering RT (RT Degree Root 60); Root NDT 5X/VT and Fit-Up Insp signed by the seed */
export const ROOT_RT_JOINT: SeededJoint = { xrefid: '4T535', hull: 'N7099', drawing: 'H711-1235', joint: 'FO-11268' };

export const jointUrl =(j: SeededJoint) => `/jobs/${j.hull}/${j.drawing}/${j.joint}`;

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

const PROCEDURE: Record<string, string> = { PT: 'ASTM E165', MT: 'ASTM E709', '5X': '5X Magnified Visual' };

/* signs the joint's current inspection (an NDT MT/PT routing or Excavation NDT), then opens the joint again.
   Type first, since changing it clears the form. The ID accessible question is required on Root NDT MT/PT,
   optional on Excavation NDT and not asked on 5X. */
export async function signInspectionOn(page: Page, j: SeededJoint, type: 'MT' | 'PT' | '5X', result: 'SAT' | 'UNSAT') {
  const panel = signoffPanel(page);
  await typeSelect(page).selectOption({ label: type });
  const idAccessible = panel.getByRole('combobox', { name: /^Inner surface of the weld \/ ID is accessible\*?$/ });
  if (await idAccessible.count()) await idAccessible.selectOption('Yes');
  await panel.getByRole('combobox', { name: 'Procedure Used for Inspection*' }).selectOption({ label: PROCEDURE[type] });
  await panel.getByRole('radio', { name: result, exact: true }).check();
  await signAndConfirm(page);
  await openJoint(page, j);
}

/* signs the joint's current Repair with this Repair Code, then opens the joint again */
export async function signRepairOn(page: Page, j: SeededJoint, code: 'Grind Only' | 'Weld Repair' | 'Cut') {
  await signoffPanel(page).getByRole('combobox', { name: 'Repair Code*' }).selectOption({ label: code });
  await signAndConfirm(page);
  await openJoint(page, j);
}

/* on History: presses the one Deprogress button and confirms with this reason */
export async function deprogressFromHistory(page: Page, reason: string) {
  const button = page.locator('main').getByRole('button', { name: 'Deprogress' });
  await expect(button).toHaveCount(1);
  await button.click();
  await answerConfirm(page, 'Deprogress', reason, 'Deprogress');
}

/* on History: the row that offers Deprogress */
export const deprogressRow = (page: Page) =>
  page.locator('main tr').filter({ has: page.getByRole('button', { name: 'Deprogress' }) });
