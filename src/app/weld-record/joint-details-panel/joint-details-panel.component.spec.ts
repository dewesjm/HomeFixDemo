import { TestBed } from '@angular/core/testing';
import { testJob } from '../../testing/test-job';
import { JointDetailsPanelComponent } from './joint-details-panel.component';

describe('Joint details attribute codes', () => {
  it('shows no attribute badges above the details; Show more lists each code with its message', () => {
    const fixture = TestBed.createComponent(JointDetailsPanelComponent);
    fixture.componentRef.setInput('job', testJob({ attributeCode1: 'LR', attributeCode2: 'SI' }));
    fixture.componentRef.setInput('currentRouting', 'Fit');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[aria-label="Progression attributes"]')).toBeNull();
    expect(el.textContent).not.toContain('ALLOW 60 DEG RT IN LIEU OF INTERMEDIATE LAYER PT');
    fixture.componentInstance.showAudit.set(true);
    fixture.detectChanges();
    expect(el.textContent).toContain('LR ALLOW 60 DEG RT IN LIEU OF INTERMEDIATE LAYER PT');
  });
});
