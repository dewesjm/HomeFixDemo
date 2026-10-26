import { setRepairCodes } from '../../../data/repair-codes';
import { DefinitionFieldComponent } from '../../signoff-panel/definition-field.component';
import { SignoffContext } from '../../signoff-panel/signoff-context';
import { stageFromTemplate, nextRepairStage } from '../../routing/added-steps';
import { stageFieldOptions } from '../../joint-page/rules/stage-form';
import { lookupCatalogField } from '../../signoff-definition/field-catalog';
import { TestBed } from '@angular/core/testing';
import { AdminRepairCodesComponent } from './admin-repair-codes.component';
import { getRepairCodes } from '../../../data/repair-codes';
import { repairCodeError } from './repair-code-validation';

describe('Admin Repair Codes', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  it('adds, rejects blanks/duplicates, cancels, renames and retires through rendered controls', async () => {
    const fixture = TestBed.createComponent(AdminRepairCodesComponent);
    fixture.detectChanges(); await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    const button = (text: string) => Array.from(host.querySelectorAll('button')).find(b => (b.getAttribute('aria-label') || b.textContent!.trim()) === text)!;
    const name = async (text: string) => {
      const input = host.querySelector<HTMLInputElement>('[aria-label="Repair Code name"]')!;
      input.value = text; input.dispatchEvent(new Event('input')); fixture.detectChanges(); await fixture.whenStable();
    };
    button('Add Repair Code').click(); fixture.detectChanges(); await fixture.whenStable();
    expect(host.querySelector('[aria-label="Repair Code name"]')!.closest('tbody')).not.toBeNull();
    expect(host.querySelector('form')).toBeNull();
    button('Save Repair Code').click(); fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')!.textContent).toContain('Enter');
    await name(' cut '); button('Save Repair Code').click(); fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')!.textContent).toContain('already exists');
    await name('Extra inspection'); button('Save Repair Code').click(); fixture.detectChanges();
    const saved = getRepairCodes().find(r => r.name === 'Extra inspection')!;
    expect(saved.active).toBeTrue();
    host.querySelector<HTMLButtonElement>('[aria-label="Edit Extra inspection"]')!.click(); fixture.detectChanges(); await fixture.whenStable();
    await name('Discard'); button('Cancel').click(); fixture.detectChanges();
    expect(getRepairCodes().find(r => r.code === saved.code)!.name).toBe('Extra inspection');
    host.querySelector<HTMLButtonElement>('[aria-label="Edit Extra inspection"]')!.click(); fixture.detectChanges(); await fixture.whenStable();
    await name('Recheck');
    const status = host.querySelector<HTMLInputElement>('[aria-label="Repair Code status"]')!;
    status.checked = false; status.dispatchEvent(new Event('change'));
    button('Save Repair Code').click(); fixture.detectChanges();
    fixture.destroy();
    const reopened = TestBed.createComponent(AdminRepairCodesComponent);
    expect(reopened.componentInstance.rows().find(r => r.code === saved.code)).toEqual({ ...saved, name: 'Recheck', active: false });
    reopened.destroy();
    expect(repairCodeError({ code: 'a', name: ' ', active: true }, [])).toBeTruthy();
  });
  it('offers a saved custom code in the rendered Repair form and records the selected stable value', async () => {
    setRepairCodes([...getRepairCodes(), { code: 'custom-recheck', name: 'Recheck', active: true }]);
    const stage = stageFromTemplate(nextRepairStage([]));
    const field = stageFieldOptions(lookupCatalogField('repairType')!, stage, { job: undefined, stages: [stage], offListUnlocked: false });
    const ctx = { fieldError: () => undefined, fieldWarning: () => '', inputsEditable: () => true,
      selectedRouting: () => stage.id, assignedLocked: () => false,
      stageSelectChange: (_stage: unknown, _field: unknown, value: string) => { stage.inputs['repairType'] = value; },
    } as unknown as SignoffContext;
    const fixture = TestBed.createComponent(DefinitionFieldComponent);
    fixture.componentRef.setInput('ctx', ctx); fixture.componentRef.setInput('stage', stage); fixture.componentRef.setInput('field', field);
    fixture.detectChanges(); await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.selectedIndex = Array.from(select.options).findIndex(o => o.textContent === 'Recheck');
    select.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(stage.inputs['repairType']).toBe('custom-recheck');
    fixture.destroy();
  });
  it('exports actual filtered sorted rows with name and status, and retains unsaved work on storage failure', async () => {
    const fixture = TestBed.createComponent(AdminRepairCodesComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.table.setGlobalFilter('Cut');
    let exported: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake(blob => { exported = blob as Blob; return 'blob:test'; });
    spyOn(URL, 'revokeObjectURL'); spyOn(HTMLAnchorElement.prototype, 'click');
    c.exportCsv();
    const csv = await exported!.text();
    expect(csv).toContain('Repair Code,Status'); expect(csv).toContain('Cut,Active'); expect(csv).not.toContain('Grind Only');
    c.add(); c.draft.name = 'New';
    spyOn(Storage.prototype, 'setItem').and.throwError('quota');
    c.save();
    expect(c.editing()).not.toBeNull(); expect(c.error).toContain('could not be saved');
    expect(getRepairCodes().length).toBe(3);
    fixture.destroy();
  });
});
