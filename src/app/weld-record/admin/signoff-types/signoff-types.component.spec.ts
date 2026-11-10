import { TestBed } from '@angular/core/testing';
import { AdminSignoffTypesComponent } from './signoff-types.component';
import { getSignoffTypes, setSignoffTypes } from '../../../data/signoff-types';

describe('Signoff Types settings', () => {
  afterEach(() => { localStorage.clear(); setSignoffTypes(getSignoffTypes()); });

  it('keeps Signs routing editable and persists it with the Type', () => {
    localStorage.clear();
    setSignoffTypes(getSignoffTypes());
    TestBed.configureTestingModule({});
    const component = TestBed.runInInjectionContext(() => new AdminSignoffTypesComponent());
    const row = component.rows().find(t => t.value === 'final-weld')!;
    component.startEdit(row);
    component.setSignsStep(row, 'root-layer');
    component.saveEdit(component.rows().find(t => t.value === 'final-weld')!);
    expect(getSignoffTypes().find(t => t.value === 'final-weld')!.signsStep).toBe('root-layer');
  });

  it('saves and removes conditional additional signoffs without changing Signs routing', () => {
    localStorage.clear();
    const component = TestBed.runInInjectionContext(() => new AdminSignoffTypesComponent());
    let row = component.rows().find(t => t.value === 'root')!;
    expect(row.alsoSigns!.length).toBe(2);
    component.startEdit(row);
    row.alsoSigns = [row.alsoSigns![0]];
    component.saveEdit(row);
    expect(getSignoffTypes().find(t => t.value === 'root')!.alsoSigns!.length).toBe(1);
    row = component.rows().find(t => t.value === 'root')!;
    component.startEdit(row);
    row.alsoSigns = [];
    component.saveEdit(row);
    expect(getSignoffTypes().find(t => t.value === 'root')!.alsoSigns).toEqual([]);
    expect(getSignoffTypes().find(t => t.value === 'root')!.signsStep).toBeUndefined();
  });
});
