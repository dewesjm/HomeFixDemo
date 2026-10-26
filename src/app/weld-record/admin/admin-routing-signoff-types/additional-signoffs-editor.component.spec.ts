import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AdditionalSignoffsEditorComponent } from './additional-signoffs-editor.component';
import { ConditionGroupEditorComponent } from '../admin-signoff-type-definition/condition-group-editor.component';
import { AdditionalSignoff } from '../../signoff-definition/routing-signoff-types';

describe('Additional Signoffs condition editor', () => {
  it('keeps new clauses and nested groups visible while editing and emits only complete conditions', () => {
    const fixture = TestBed.createComponent(AdditionalSignoffsEditorComponent);
    let rules: AdditionalSignoff[] = [{ stepId: 'root-layer', type: 'vt', when: { all: [] } }];
    fixture.componentRef.setInput('rules', rules);
    fixture.componentRef.setInput('routings', []);
    fixture.componentInstance.changed.subscribe(value => {
      rules = value;
      fixture.componentRef.setInput('rules', rules);
    });
    fixture.detectChanges();
    const click = (label: string, last = false) => {
      const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
      const matches = buttons.filter(b => b.textContent?.trim() === label);
      (last ? matches[matches.length - 1] : matches[0]).click();
      fixture.detectChanges();
    };
    click('Add clause');
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Form field"]').length).toBe(1);
    click('Add group', true);
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Form field"]').length).toBe(2);
    expect(rules[0].when).toEqual({ all: [] });
    const editors = fixture.debugElement.queryAll(By.directive(ConditionGroupEditorComponent));
    const nested = editors[1].componentInstance as ConditionGroupEditorComponent;
    nested.updateClause(0, { key: 'inspectionResult', equals: 'sat' });
    fixture.detectChanges();
    expect(rules[0].when).toEqual({ all: [{ any: [{ source: 'field', key: 'inspectionResult', equals: 'sat' }] }] });
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Form field"]').length).toBe(2);
    fixture.componentInstance.patch(0, { type: '5x' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Form field"]').length).toBe(2);
  });
});
