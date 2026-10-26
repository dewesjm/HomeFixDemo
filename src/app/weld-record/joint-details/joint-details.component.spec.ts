import { TestBed } from '@angular/core/testing';
import { addTestJob } from '../../data/jobs';
import { JointDetailsComponent } from './joint-details.component';

describe('Joint details attribute messages', () => {
  it('exposes supplied messages on focusable badges and expanded details, including inactive conditions', () => {
    const fixture = TestBed.createComponent(JointDetailsComponent);
    fixture.componentRef.setInput('job', { ...addTestJob(), attributeCode1: 'LR', attributeCode2: 'SI', attributeLocation: 'Unknown' });
    fixture.componentRef.setInput('currentRouting', 'Fit');
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('[aria-label="Progression attributes"] [data-tip]') as HTMLElement;
    expect(badge.tabIndex).toBe(0);
    expect(badge.getAttribute('aria-label')).toContain(badge.getAttribute('data-tip')!);
    expect(fixture.nativeElement.textContent).toContain('current requirements retained');
    fixture.componentInstance.showAudit.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ALLOW 60 DEG RT IN LIEU OF INTERMEDIATE LAYER PT');
  });
});
