import { TestBed } from '@angular/core/testing';
import { ExcavationTypeRulesComponent } from './excavation-type-rules.component';
import { excavationTypeOptions, getSignoffTypeRows, setSignoffTypeRows } from '../../signoff-definition/signoff-types';
import { JOBS } from '../../../data/jobs';

describe('Excavation Type exceptions editor', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { localStorage.clear(); setSignoffTypeRows(getSignoffTypeRows()); });
  it('removing the seeded exception changes actual inspection selection, and saves other rows unchanged', () => {
    const job = { ...JOBS[0], materialType1: '12-SS304', materialType2: '02-CS' };
    const other = getSignoffTypeRows().filter(r => r.stepId !== 'excavation-ndt');
    const editor = TestBed.runInInjectionContext(() => new ExcavationTypeRulesComponent());
    expect(excavationTypeOptions(job, 'pt')?.[0].value).toBe('5x');
    editor.rules = [];
    editor.save();
    expect(excavationTypeOptions(job, 'pt')?.[0].value).toBe('pt');
    expect(getSignoffTypeRows().filter(r => r.stepId !== 'excavation-ndt')).toEqual(other);
  });
  it('uses saved exception order and checks both material members', () => {
    const job = { ...JOBS[0], materialType1: '02-CS', materialType2: '12-SS304' };
    const editor = TestBed.runInInjectionContext(() => new ExcavationTypeRulesComponent());
    editor.rules.push({ from: 'pt', to: 'mt', materialFlag: '' });
    editor.move(1, -1); editor.save();
    expect(excavationTypeOptions(job, 'pt')?.[0].value).toBe('mt');
    expect(excavationTypeOptions(job, 'rt')?.[0].value).toBe('rt');
  });
  it('renders its saved source and exception in the admin form', () => {
    const fixture = TestBed.createComponent(ExcavationTypeRulesComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Non-ferrous or austenitic');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    fixture.destroy();
  });
});
