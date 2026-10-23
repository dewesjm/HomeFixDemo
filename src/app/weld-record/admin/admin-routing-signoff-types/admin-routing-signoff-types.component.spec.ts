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
});
