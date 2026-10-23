import { TestBed } from '@angular/core/testing';
import { AdminSignoffTypesComponent } from './admin-signoff-types.component';
import { getSignoffTypeRows, setSignoffTypeRows } from '../../signoff-definition/signoff-types';

describe('Signoff Types By Routing admin', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { localStorage.clear(); setSignoffTypeRows(getSignoffTypeRows()); });
  it('retains Excavation Type rules when another routing is edited and saved', () => {
    const component = TestBed.runInInjectionContext(() => new AdminSignoffTypesComponent());
    const expected = getSignoffTypeRows().find(r => r.stepId === 'excavation-ndt');
    const row = component.rows().find(r => r.stepId === 'tack')!;
    component.startEdit(row); component.saveEdit(row);
    expect(getSignoffTypeRows().find(r => r.stepId === 'excavation-ndt')).toEqual(expected);
    expect(component.steps.filter(s => s.id === 'repair').length).toBe(1);
  });
});
