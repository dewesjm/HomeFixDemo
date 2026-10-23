import { TestBed } from '@angular/core/testing';
import { DefinitionFieldComponent } from './definition-field.component';
import { SignoffContext } from './signoff-context';
import { addTestJob } from '../../data/jobs';
import { buildStages } from '../routing/build-stages';
import { visibleSignoffFields } from '../signoff-definition/shown-fields';
import { FormField } from '../signoff-definition/field-catalog';
import { WorkflowStage } from '../model/workflow-types';

describe('Defer Tack control', () => {
  it('renders a checkbox and records yes or blank when toggled', () => {
    const job = addTestJob();
    const fit = buildStages(job).find(s => s.id === 'fit')!;
    const field = visibleSignoffFields(fit, job, {}).find(f => f.key === 'deferTack')!;
    const ctx = { editable: () => true, fieldError: () => undefined,
      signoffCheckboxChange: (s: WorkflowStage, f: FormField, checked: boolean) => { s.signoffInputs[f.key] = checked ? 'yes' : ''; },
    } as unknown as SignoffContext;
    const fixture = TestBed.createComponent(DefinitionFieldComponent);
    fixture.componentRef.setInput('ctx', ctx);
    fixture.componentRef.setInput('stage', fit);
    fixture.componentRef.setInput('field', field);
    fixture.componentRef.setInput('signoff', true);
    fixture.detectChanges();
    const checkbox = fixture.nativeElement.querySelector('input[type=checkbox]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[type=text]')).toBeNull();
    checkbox.checked = true; checkbox.dispatchEvent(new Event('change'));
    expect(fit.signoffInputs['deferTack']).toBe('yes');
    checkbox.checked = false; checkbox.dispatchEvent(new Event('change'));
    expect(fit.signoffInputs['deferTack']).toBe('');
    fixture.destroy();
  });
});
