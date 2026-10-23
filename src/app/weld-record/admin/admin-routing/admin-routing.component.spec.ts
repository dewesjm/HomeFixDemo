import { TestBed } from '@angular/core/testing';
import { AdminRoutingComponent } from './admin-routing.component';
import { getTemplates } from '../../routing/stage-templates';
import { getRoutingSignoffTypes, setRoutingSignoffTypes } from '../../signoff-definition/routing-signoff-types';

describe('Routing Settings rules editor', () => {
  let component: AdminRoutingComponent;
  beforeEach(() => {
    localStorage.clear();
    setRoutingSignoffTypes(getRoutingSignoffTypes());
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new AdminRoutingComponent());
  });
  afterEach(() => { localStorage.clear(); setRoutingSignoffTypes(getRoutingSignoffTypes()); });

  it('offers self, earlier and later routings for Then go to, without add targets', () => {
    const row = component.rows().find(r => r.id === 'Welding:fit')!;
    component.openThenRules(row);
    const ids = component.rejectTargets(row).map(t => t.id);
    expect(ids).toContain('fit');
    expect(ids).toContain('pre-fit');
    expect(ids).toContain('sold');
    expect(ids).not.toContain('repair');
    expect(ids).not.toContain('engineering-hold');
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
