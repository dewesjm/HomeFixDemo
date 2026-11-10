import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminSignoffTypeRoutingComponent } from './admin-signoff-type-routing.component';
import { getSignoffTypeRoutingRows, setSignoffTypeRoutingRows } from '../../../data/signoff-type-routing';

describe('Signoff Type to Routing admin', () => {
  it('exports readable ordered exception conditions with the routing and source', async () => {
    setSignoffTypeRoutingRows([{ stepId: 'fit', types: [{ type: 'fit' }], typeExceptions: [
      { from: 'fit', to: 'vt', when: [[{ field: 'nInd', op: 'is', values: ['3'] }]] }] }]);
    const component = TestBed.runInInjectionContext(() => new AdminSignoffTypeRoutingComponent());
    TestBed.flushEffects();
    let exported: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake(blob => { exported = blob as Blob; return 'blob:test'; });
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');
    component.exportCsv();
    const text = await exported!.text();
    expect(text).toContain('Routing,Type source,Type exceptions,Options');
    expect(text).toContain('Signoff Type Selection');
    expect(text).toContain('Fit -> VT ((N Ind. is 3))');
  });
  beforeEach(() => localStorage.clear());
  afterEach(() => { localStorage.clear(); setSignoffTypeRoutingRows(getSignoffTypeRoutingRows()); });
  it('shows Type source read-only while editing and re-adds Excavation on the rejecting inspection', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const f = TestBed.createComponent(AdminSignoffTypeRoutingComponent); f.detectChanges(); await f.whenStable();
    const c = f.componentInstance; const host: HTMLElement = f.nativeElement;
    const row = c.rows().find(r => r.stepId === 'excavation-ndt')!;
    c.startEdit(row); f.detectChanges(); await f.whenStable();
    expect(host.querySelector('select[aria-label="Type source"]')).toBeNull();
    expect(host.textContent).toContain('Type source: Rejecting inspection');
    c.cancelEdit(row);
    c.addRow(); c.setStep(c.rows()[0], 'nqc-excavation-ndt');
    expect(c.rows()[0].typeSource).toBe('rejecting-inspection');
    c.setStep(c.rows()[0], 'tack');
    expect(c.rows()[0].typeSource).toBeUndefined();
  });
  it('cancels nested condition edits and saves changed enable rules', () => {
    const component = TestBed.runInInjectionContext(() => new AdminSignoffTypeRoutingComponent());
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
    expect(getSignoffTypeRoutingRows().find(r => r.stepId === row.stepId)!.types[0].enableWhen).toEqual([]);
  });
  it('retains Excavation Type rules when another routing is edited and saved', () => {
    const component = TestBed.runInInjectionContext(() => new AdminSignoffTypeRoutingComponent());
    const expected = getSignoffTypeRoutingRows().find(r => r.stepId === 'excavation-ndt');
    const row = component.rows().find(r => r.stepId === 'tack')!;
    component.startEdit(row); component.saveEdit(row);
    expect(getSignoffTypeRoutingRows().find(r => r.stepId === 'excavation-ndt')).toEqual(expected);
    expect(component.steps.filter(s => s.id === 'repair').length).toBe(1);
  });
});
