import { TestBed } from '@angular/core/testing';
import { AdminSignoffTypesComponent } from './admin-signoff-types.component';
import { getSignoffTypeRows, setSignoffTypeRows } from '../../signoff-definition/signoff-types';

describe('Signoff Types By Routing admin', () => {
  it('exports readable ordered exception conditions with the routing and source', async () => {
    setSignoffTypeRows([{ stepId: 'fit', types: [{ type: 'fit' }], typeExceptions: [
      { from: 'fit', to: 'vt', when: [[{ field: 'nInd', op: 'is', values: ['3'] }]] }] }]);
    const component = TestBed.runInInjectionContext(() => new AdminSignoffTypesComponent());
    TestBed.flushEffects();
    let exported: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake(blob => { exported = blob as Blob; return 'blob:test'; });
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');
    component.exportCsv();
    const text = await exported!.text();
    expect(text).toContain('Routing,Type source,Type exceptions,Options');
    expect(text).toContain('Configured options');
    expect(text).toContain('Fit -> VT ((N Ind. is 3))');
  });
  beforeEach(() => localStorage.clear());
  afterEach(() => { localStorage.clear(); setSignoffTypeRows(getSignoffTypeRows()); });
  it('cancels nested condition edits and saves changed enable rules', () => {
    const component = TestBed.runInInjectionContext(() => new AdminSignoffTypesComponent());
    const row = component.rows().find(r => r.stepId === 'final-ndt-vt5x')!;
    const original = structuredClone(row.types);
    component.startEdit(row);
    row.types[0].enableWhen![0][0].values = ['MT'];
    component.cancelEdit(row);
    const restored = component.rows().find(r => r.stepId === row.stepId)!;
    expect(restored.types).toEqual(original);
    component.startEdit(restored);
    restored.types[0].enableWhen = [];
    component.saveEdit(restored);
    expect(getSignoffTypeRows().find(r => r.stepId === row.stepId)!.types[0].enableWhen).toEqual([]);
  });
  it('retains Excavation Type rules when another routing is edited and saved', () => {
    const component = TestBed.runInInjectionContext(() => new AdminSignoffTypesComponent());
    const expected = getSignoffTypeRows().find(r => r.stepId === 'excavation-ndt');
    const row = component.rows().find(r => r.stepId === 'tack')!;
    component.startEdit(row); component.saveEdit(row);
    expect(getSignoffTypeRows().find(r => r.stepId === 'excavation-ndt')).toEqual(expected);
    expect(component.steps.filter(s => s.id === 'repair').length).toBe(1);
  });
});
