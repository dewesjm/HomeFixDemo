import { TestBed } from '@angular/core/testing';
import { TypeExceptionsComponent } from './type-exceptions.component';
import { excavationTypeOptions, getSignoffTypeRows, setSignoffTypeRows } from '../../signoff-definition/signoff-types';
import { signoffTypeOptions } from '../../signoff-definition/signoff-types';
import { JOBS } from '../../../data/jobs';

describe('Excavation Type exceptions editor', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { localStorage.clear(); setSignoffTypeRows(getSignoffTypeRows()); });
  it('selects an ordinary routing, edits conditions through DOM, saves, cancels and reopens', async () => {
    const fixture = TestBed.createComponent(TypeExceptionsComponent);
    fixture.detectChanges(); await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    const select = (label: string, value: string) => {
      const el = host.querySelector<HTMLSelectElement>(`[aria-label="${label}"]`)!;
      el.value = value; el.dispatchEvent(new Event('change')); fixture.detectChanges();
    };
    const button = (label: string) => Array.from(host.querySelectorAll('button')).find(b => b.textContent!.trim() === label)!;
    select('Exception routing', 'fit');
    button('Add exception').click(); fixture.detectChanges(); await fixture.whenStable();
    select('Original Type', 'fit'); select('Replacement Type', 'vt'); select('Material condition', '');
    button('Add OR rule').click(); fixture.detectChanges(); await fixture.whenStable();
    expect(host.querySelector('[aria-label="Effective Type path"]')!.textContent).toContain('N Ind. is 3');
    button('Save Type rules').click(); fixture.detectChanges();
    expect(signoffTypeOptions('fit', { ...JOBS[0], nInd: '3' })?.[0].value).toBe('vt');
    select('Replacement Type', 'pt');
    button('Cancel Type rules').click(); fixture.detectChanges();
    expect(fixture.componentInstance.rules[0].to).toBe('vt');
    fixture.destroy();
    const reopened = TestBed.createComponent(TypeExceptionsComponent);
    reopened.componentRef.setInput('definitionId', 'fit'); reopened.detectChanges();
    expect(reopened.componentInstance.rules[0].when?.[0][0].values).toEqual(['3']);
    expect(reopened.componentInstance.rules[0].to).toBe('vt'); reopened.destroy();
  });
  it('removing the seeded exception changes actual inspection selection, and saves other rows unchanged', () => {
    const job = { ...JOBS[0], materialType1: '12-SS304', materialType2: '02-CS' };
    const other = getSignoffTypeRows().filter(r => r.stepId !== 'excavation-ndt');
    const editor = TestBed.runInInjectionContext(() => new TypeExceptionsComponent());
    editor.ngOnInit();
    expect(excavationTypeOptions(job, 'pt')?.[0].value).toBe('5x');
    editor.rules = [];
    editor.save();
    expect(excavationTypeOptions(job, 'pt')?.[0].value).toBe('pt');
    expect(getSignoffTypeRows().filter(r => r.stepId !== 'excavation-ndt')).toEqual(other);
  });
  it('uses saved exception order and checks both material members', () => {
    const job = { ...JOBS[0], materialType1: '02-CS', materialType2: '12-SS304' };
    const editor = TestBed.runInInjectionContext(() => new TypeExceptionsComponent());
    editor.ngOnInit();
    editor.rules.push({ from: 'pt', to: 'mt', materialFlag: '' });
    editor.move(1, -1); editor.save();
    expect(excavationTypeOptions(job, 'pt')?.[0].value).toBe('mt');
    expect(excavationTypeOptions(job, 'rt')?.[0].value).toBe('rt');
  });
  it('edits NQC independently through rendered controls, cancels and reloads', () => {
    const fixture = TestBed.createComponent(TypeExceptionsComponent);
    fixture.componentRef.setInput('definitionId', 'nqc-excavation-ndt');
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('h3')!.textContent).toContain('Type Exceptions');
    const replacement = host.querySelector<HTMLSelectElement>('[aria-label="Replacement Type"]')!;
    replacement.value = 'mt'; replacement.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const button = (label: string) => Array.from(host.querySelectorAll('button')).find(b => b.textContent!.trim() === label)!;
    button('Cancel Type rules').click(); fixture.detectChanges();
    expect(fixture.componentInstance.rules[0].to).toBe('5x');
    replacement.value = 'ut'; replacement.dispatchEvent(new Event('change'));
    fixture.detectChanges(); button('Save Type rules').click();
    fixture.destroy();
    const reopened = TestBed.createComponent(TypeExceptionsComponent);
    reopened.componentRef.setInput('definitionId', 'nqc-excavation-ndt'); reopened.detectChanges();
    expect(reopened.componentInstance.rules[0].to).toBe('ut');
    expect(getSignoffTypeRows().find(r => r.stepId === 'excavation-ndt')!.typeExceptions![0].to).toBe('5x');
    reopened.destroy();
  });
  it('renders its saved source and exception in the admin form', () => {
    const fixture = TestBed.createComponent(TypeExceptionsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Non-ferrous or austenitic');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    fixture.destroy();
  });
});
