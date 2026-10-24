import { provideRouter } from '@angular/router';
import { fakeAsync, tick, TestBed } from '@angular/core/testing';
import { AdminRoutingComponent } from './admin-routing.component';
import { addStageTemplate, updateStageTemplate, isAddedTemplateId, deleteStageTemplate, getTemplates } from '../../routing/stage-templates';
import { getSignoffTypeRows, setSignoffTypeRows } from '../../signoff-definition/signoff-types';
import { buildStages } from '../../routing/build-stages';
import { JOBS } from '../../../data/jobs';
import { getRoutingSignoffTypes, setRoutingSignoffTypes } from '../../signoff-definition/routing-signoff-types';

describe('Routing Settings rules editor', () => {
  let component: AdminRoutingComponent;
  beforeEach(() => {
    localStorage.clear();
    setRoutingSignoffTypes(getRoutingSignoffTypes());
    TestBed.configureTestingModule({ imports: [AdminRoutingComponent], providers: [provideRouter([])] });
    component = TestBed.runInInjectionContext(() => new AdminRoutingComponent());
  });
  afterEach(() => { localStorage.clear(); setRoutingSignoffTypes(getRoutingSignoffTypes()); });

  it('renders the added-definition create and setup controls, saves a draft and cancels edits', fakeAsync(() => {
    const fixture = TestBed.createComponent(AdminRoutingComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const add = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Add added routing')!;
    add.click();
    fixture.detectChanges();
    const input = host.querySelector<HTMLInputElement>('input[aria-label="Routing name"]')!;
    input.value = 'Rendered inspection';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const draft = fixture.componentInstance.rows().find(r => r.id === fixture.componentInstance.editingId())!;
    fixture.componentInstance.saveEdit(draft);
    fixture.detectChanges();
    expect(host.textContent).toContain('Rendered inspection');
    expect(host.textContent).toContain('Status: draft');
    expect(host.querySelector('a[href="/admin/signoff-fields"]')).not.toBeNull();
    const saved = fixture.componentInstance.rows().find(r => r.routing === 'Rendered inspection')!;
    fixture.componentInstance.startEdit(saved);
    fixture.componentInstance.updateField(saved, 'routing', 'Discard me');
    fixture.componentInstance.cancelEdit(saved);
    fixture.detectChanges();
    expect(host.textContent).not.toContain('Discard me');
    tick(2000);
    fixture.destroy();
  }));

  it('creates, reopens, renames and deactivates an added definition without numbering it', fakeAsync(() => {
    component.addRow(true);
    let row = component.rows().find(r => r.id === component.editingId())!;
    expect(component.isAdded(row)).toBeTrue();
    component.updateField(row, 'routing', 'Extra inspection');
    component.updateField(row, 'role', 'Inspector');
    component.saveEdit(component.rows().find(r => r.id === row.id)!);
    row = component.rows().find(r => r.routing === 'Extra inspection')!;
    const id = row.id.split(':')[1];
    expect(row.status).toBe('draft');
    expect(isAddedTemplateId(id)).toBeTrue();
    expect(buildStages(JOBS[0]).some(s => s.id === id)).toBeFalse();
    expect(component.rejectTargets(row).some(t => t.id === id)).toBeFalse();
    component.toggleStatus(row);
    expect(getTemplates()['Welding'].find(t => t.id === id)!.status).toBe('draft');
    setSignoffTypeRows([...getSignoffTypeRows(), { stepId: id, types: [{ type: 'vt', default: true }] }]);
    component.toggleStatus(row);
    expect(getTemplates()['Welding'].find(t => t.id === id)!.status).toBe('active');
    component.startEdit(row);
    component.updateField(row, 'routing', 'Renamed inspection');
    component.saveEdit(component.rows().find(r => r.id === row.id)!);
    const reopened = TestBed.runInInjectionContext(() => new AdminRoutingComponent());
    row = reopened.rows().find(r => r.id === row.id)!;
    expect(row.routing).toBe('Renamed inspection');
    expect(row.sequence).toBe(0);
    expect(getSignoffTypeRows().some(t => t.stepId === id)).toBeTrue();
    reopened.toggleStatus(row);
    expect(getTemplates()['Welding'].find(t => t.id === id)!.status).toBe('inactive');
    expect(() => deleteStageTemplate('Welding', id)).toThrowError(/Deactivate/);
    tick(2000);
  }));

  it('cancels an added draft and rejects empty or duplicate names', fakeAsync(() => {
    const count = component.rows().length;
    component.addRow(true);
    let row = component.rows().find(r => r.id === component.editingId())!;
    component.saveEdit(row);
    expect(component.editingId()).toBe(row.id);
    component.updateField(row, 'routing', ' Fit ');
    row = component.rows().find(r => r.id === row.id)!;
    component.saveEdit(row);
    expect(component.editingId()).toBe(row.id);
    component.cancelEdit(row);
    expect(component.rows().length).toBe(count);
    tick(2000);
  }));

  it('enforces classification and activation validation in the configuration owner', () => {
    addStageTemplate('Welding', { id: 'custom-added', label: 'Extra', role: 'Inspector', classification: 'added' });
    expect(() => updateStageTemplate('Welding', 'custom-added', { status: 'active' })).toThrowError(/Signoff Type/);
    updateStageTemplate('Welding', 'custom-added', { classification: 'numbered', lifecycle: 'repair' });
    const definition = getTemplates()['Welding'].find(t => t.id === 'custom-added')!;
    expect(definition.classification).toBe('added');
    expect(definition.lifecycle).toBe('ordinary');
  });

  it('pins a new draft at the top with the next numbered position and preserves its number after saving', fakeAsync(() => {
    const before = component.rows().filter(row => !component.isAdded(row));
    const next = Math.max(...before.map(row => row.sequence)) + 1;
    component.addRow();
    TestBed.flushEffects();
    const draft = component.rows().find(row => row.id === component.editingId())!;
    expect(draft.sequence).toBe(next);
    expect(component.sectionRows(false)[0].id).toBe(draft.id);
    tick(2000);
    expect(component.sectionRows(false)[0].id).toBe(draft.id);
    component.updateField(draft, 'routing', 'Extra review');
    component.saveEdit(component.rows().find(row => row.id === draft.id)!);
    TestBed.flushEffects();
    const saved = component.rows().find(row => row.routing === 'Extra review')!;
    expect(saved.sequence).toBe(next);
    expect(component.sectionRows(false).at(-1)!.id).toBe(saved.id);
    const reopened = TestBed.runInInjectionContext(() => new AdminRoutingComponent());
    expect(reopened.rows().find(row => row.routing === 'Extra review')!.sequence).toBe(next);
    expect(reopened.rows().filter(row => !reopened.isAdded(row)).map(row => row.sequence))
      .toEqual(Array.from({ length: next }, (_, index) => index + 1));
  }));

  it('cancels a pinned draft and reuses its available number', fakeAsync(() => {
    const count = component.rows().length;
    component.addRow();
    const draft = component.rows().find(row => row.id === component.editingId())!;
    component.cancelEdit(draft);
    expect(component.rows().length).toBe(count);
    expect(getTemplates()['Welding'].some(row => row.id.startsWith('new-'))).toBeFalse();
    component.addRow();
    expect(component.rows().find(row => row.id === component.editingId())!.sequence).toBe(draft.sequence);
    tick(2000);
  }));

  it('offers self, earlier and later routings for Then go to, with add targets', () => {
    const row = component.rows().find(r => r.id === 'Welding:fit')!;
    component.openThenRules(row);
    const ids = component.rejectTargets(row).map(t => t.id);
    expect(ids).toContain('fit');
    expect(ids).toContain('pre-fit');
    expect(ids).toContain('sold');
    expect(ids).toContain('repair');
    expect(ids).toContain('engineering-hold');
    expect(component.rejFields().some(f => f.key === 'self.inspectionType')).toBeTrue();
    expect(component.rejFields().find(f => f.key === 'ndtEach')!.values).toContain('');
  });

  it('edits a copy, saves ordered rules and leaves reject settings untouched', () => {
    const row = component.rows().find(r => r.id === 'Welding:fit')!;
    component.openThenRules(row);
    component.setRejectTo(0, 'tack');
    expect(getTemplates()['Welding'].find(t => t.id === 'fit')!.thenRules![0].to).toBe('fit');
    component.addRejectRule();
    component.setRejectClause(1, 0, { field: 'self.inspectionType' });
    component.toggleRejectValue(1, 0, 'fit');
    component.moveRejectRule(1, -1);
    expect(component.rejectRulesValid()).toBeTrue();
    component.saveRejectRules();
    const template = getTemplates()['Welding'].find(t => t.id === 'fit')!;
    expect(template.thenRules!.map(r => r.to)).toEqual(['fit', 'tack']);
    expect(template.rejectToStage).toBeFalsy();
    expect(component.rows().find(r => r.id === row.id)!.thenRules.length).toBe(2);
    component.openThenRules(row);
    component.removeRejectRule(1);
    component.removeRejectRule(0);
    component.saveRejectRules();
    expect(getTemplates()['Welding'].find(t => t.id === 'fit')!.thenRules).toEqual([]);
  });

  it('separates added routings and edits the unconditional Excavation fallback', () => {
    expect(component.rows().filter(r => component.isAdded(r)).map(r => r.id)).toEqual([
      'Welding:repair', 'Welding:excavation-ndt', 'Welding:engineering-hold',
    ]);
    const row = component.rows().find(r => r.id === 'Welding:excavation-ndt')!;
    component.openThenRules(row);
    expect(component.rejRules().at(-1)?.when).toEqual([]);
    expect(component.rejectRulesValid()).toBeTrue();
    component.removeRejectClause(0, 0);
    expect(component.rejRules()[0].when).toEqual([]);
    component.saveRejectRules();
    expect(getTemplates()['Welding'].find(t => t.id === 'excavation-ndt')!.thenRules![0].when).toEqual([]);
  });

  it('keeps the Reject editor on its existing rules and targets', () => {
    const row = component.rows().find(r => r.id === 'Welding:root-ndt-mtpt')!;
    component.openThenRules(row);
    component.openRejectRules(row);
    expect(component.ruleMode()).toBe('reject');
    expect(component.rejectTargets(row).map(t => t.id)).toContain('repair');
    expect(component.rejectTargets(row).map(t => t.id)).toContain('engineering-hold');
    expect(component.rejRules()[0].to).toBe('engineering-hold');
  });
});
