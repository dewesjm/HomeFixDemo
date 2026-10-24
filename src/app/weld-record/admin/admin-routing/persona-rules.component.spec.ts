import { getSignoffTypeRows, setSignoffTypeRows } from '../../signoff-definition/signoff-types';
import { TestBed } from '@angular/core/testing';
import { PersonaRulesComponent } from './persona-rules.component';
import { getAddedTemplate, updateStageTemplate } from '../../routing/stage-templates';
import { JOBS } from '../../../data/jobs';
import { excavationNdtStageFor } from '../../routing/added-steps';

describe('Persona rules editor', () => {
  beforeEach(() => { localStorage.clear(); setSignoffTypeRows(getSignoffTypeRows()); TestBed.configureTestingModule({ imports: [PersonaRulesComponent] }); });
  afterEach(() => localStorage.clear());
  function editor() {
    updateStageTemplate('Welding', 'nqc-excavation-ndt', { roleRules: [{ when: [{ field: 'nInd', op: 'is', values: ['1', '2'] }], role: 'NQC Inspector' }] });
    const fixture = TestBed.createComponent(PersonaRulesComponent);
    fixture.componentRef.setInput('routing', getAddedTemplate('nqc-excavation-ndt'));
    fixture.componentRef.setInput('trade', 'Welding');
    fixture.detectChanges();
    return fixture;
  }
  it('renders the default rule and cancels without saving nested changes', () => {
    const fixture = editor();
    const component = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).toContain('Persona: NQC Excavation NDT');
    component.toggle(0, 0, '1');
    component.rules[0].role = 'Foreman';
    const cancel = [...fixture.nativeElement.querySelectorAll('button')].find((button: any) => button.textContent.trim() === 'Cancel') as HTMLButtonElement;
    const closed = spyOn(component.closed, 'emit');
    cancel.click();
    expect(closed).toHaveBeenCalled();
    expect(getAddedTemplate('nqc-excavation-ndt').roleRules![0].when[0].values).toEqual(['1', '2']);
    expect(getAddedTemplate('nqc-excavation-ndt').roleRules![0].role).toBe('NQC Inspector');
  });
  it('saves through the rendered control and affects newly created Excavation', () => {
    const fixture = editor();
    const component = fixture.componentInstance;
    const select = fixture.nativeElement.querySelector('[aria-label="Rule persona"]') as HTMLSelectElement;
    select.value = 'Foreman'; select.dispatchEvent(new Event('change')); fixture.detectChanges();
    const fallback = fixture.nativeElement.querySelector('[aria-label="Otherwise persona"]') as HTMLSelectElement;
    fallback.value = 'Welding'; fallback.dispatchEvent(new Event('change')); fixture.detectChanges();
    const save = [...fixture.nativeElement.querySelectorAll('button')].find((button: any) => button.textContent.trim() === 'Save persona') as HTMLButtonElement;
    save.click();
    expect(excavationNdtStageFor({ ...JOBS[0], nInd: '2' }, 'pt', 'repair-2').role).toBe('Foreman');
    component.rules = []; component.save();
    const reopened = TestBed.createComponent(PersonaRulesComponent);
    reopened.componentRef.setInput('routing', getAddedTemplate('nqc-excavation-ndt'));
    reopened.componentRef.setInput('trade', 'Welding');
    reopened.detectChanges();
    expect(reopened.componentInstance.rules).toEqual([]);
    expect(excavationNdtStageFor({ ...JOBS[0], nInd: '2' }, 'pt', 'repair').role).toBe('Welding');
    expect(excavationNdtStageFor({ ...JOBS[0], nInd: '3' }, 'pt', 'repair').role).toBe('Inspector');
  });
  it('validates conditions and supports ordered and unconditional rules', () => {
    const component = editor().componentInstance;
    component.add(); expect(component.valid()).toBeFalse();
    component.patch(1, 0, { values: ['3'] }); expect(component.valid()).toBeTrue();
    component.move(1, -1); expect(component.rules[0].when[0].values).toEqual(['3']);
    component.rules[0].when = []; expect(component.valid()).toBeTrue();
    component.patch(1, 0, { field: 'self.repairType' }); expect(component.valid()).toBeFalse();
  });
});
