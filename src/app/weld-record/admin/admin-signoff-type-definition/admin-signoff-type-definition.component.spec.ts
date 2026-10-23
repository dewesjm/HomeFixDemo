import { TestBed } from '@angular/core/testing';
import { AdminSignoffTypeDefinitionComponent } from './admin-signoff-type-definition.component';
import { resetStepFieldConfig } from '../../signoff-definition/step-field-config';

describe('Shared inspection Type forms admin', () => {
  afterEach(() => resetStepFieldConfig());
  it('shows immutable catalog field types in the field choices and saved form rows', () => {
    const component = TestBed.runInInjectionContext(() => new AdminSignoffTypeDefinitionComponent());
    expect(component.fieldChoices.find(f => f.key === 'deferTack')?.typeLabel).toBe('Checkbox');
    expect(component.fieldChoices.find(f => f.key === 'wtn')?.typeLabel).toBe('Droplist');
    expect(component.rows().find(r => r.typeId === 'fit')?.fieldRules.find(f => f.key === 'deferTack')?.typeLabel).toBe('Checkbox');
  });
  it('offers the shared inspection forms without a separate Excavation NDT form', () => {
    const component = TestBed.runInInjectionContext(() => new AdminSignoffTypeDefinitionComponent());
    const ids = component.rows().map(r => r.typeId);
    expect(ids).toContain('pt');
    expect(ids).toContain('rt');
    expect(ids).not.toContain('excavation-ndt');
  });
});
