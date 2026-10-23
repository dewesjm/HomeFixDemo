import { TestBed } from '@angular/core/testing';
import { AdminSignoffTypeDefinitionComponent } from './admin-signoff-type-definition.component';
import { resetStepFieldConfig } from '../../signoff-definition/step-field-config';

describe('Shared inspection Type forms admin', () => {
  afterEach(() => resetStepFieldConfig());
  it('offers the shared inspection forms without a separate Excavation NDT form', () => {
    const component = TestBed.runInInjectionContext(() => new AdminSignoffTypeDefinitionComponent());
    const ids = component.rows().map(r => r.typeId);
    expect(ids).toContain('pt');
    expect(ids).toContain('rt');
    expect(ids).not.toContain('excavation-ndt');
  });
});
