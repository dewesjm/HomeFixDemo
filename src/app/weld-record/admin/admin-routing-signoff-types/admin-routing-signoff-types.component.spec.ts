import { TestBed } from '@angular/core/testing';
import { AdminRoutingSignoffTypesComponent } from './admin-routing-signoff-types.component';
import { getRoutingSignoffTypes, setRoutingSignoffTypes } from '../../signoff-definition/routing-signoff-types';

describe('Signoff Types settings', () => {
  afterEach(() => { localStorage.clear(); setRoutingSignoffTypes(getRoutingSignoffTypes()); });

  it('keeps Signs routing editable and persists it with the Type', () => {
    localStorage.clear();
    setRoutingSignoffTypes(getRoutingSignoffTypes());
    TestBed.configureTestingModule({});
    const component = TestBed.runInInjectionContext(() => new AdminRoutingSignoffTypesComponent());
    const row = component.rows().find(t => t.value === 'final-weld')!;
    component.startEdit(row);
    component.setSignsStep(row, 'root-layer');
    component.saveEdit(component.rows().find(t => t.value === 'final-weld')!);
    expect(getRoutingSignoffTypes().find(t => t.value === 'final-weld')!.signsStep).toBe('root-layer');
    expect(getRoutingSignoffTypes().every(t => !('repeatable' in t))).toBeTrue();
  });

  it('saves and removes conditional additional signoffs without changing Signs routing', () => {
    localStorage.clear();
    const component = TestBed.runInInjectionContext(() => new AdminRoutingSignoffTypesComponent());
    let row = component.rows().find(t => t.value === 'root')!;
    expect(row.alsoSigns!.length).toBe(2);
    component.startEdit(row);
    row.alsoSigns = [row.alsoSigns![0]];
    component.saveEdit(row);
    expect(getRoutingSignoffTypes().find(t => t.value === 'root')!.alsoSigns!.length).toBe(1);
    row = component.rows().find(t => t.value === 'root')!;
    component.startEdit(row);
    row.alsoSigns = [];
    component.saveEdit(row);
    expect(getRoutingSignoffTypes().find(t => t.value === 'root')!.alsoSigns).toEqual([]);
    expect(getRoutingSignoffTypes().find(t => t.value === 'root')!.signsStep).toBeUndefined();
  });
});
