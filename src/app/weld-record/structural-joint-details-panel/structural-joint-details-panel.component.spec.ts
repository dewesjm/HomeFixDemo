import { TestBed } from '@angular/core/testing';
import { testJob } from '../../testing/test-job';
import { StructuralJointDetailsPanelComponent } from './structural-joint-details-panel.component';

describe('Structural joint details', () => {
  it('shows three materials and ET, and no Pipe Size or Wall Thickness', () => {
    const fixture = TestBed.createComponent(StructuralJointDetailsPanelComponent);
    fixture.componentRef.setInput('job', testJob({
      jointType: 'structural', pipeSize: '', wallThickness: '',
      thickness1: '0.500"', mcl3: 'MC-I', materialType3: '04-AS', item3: 'S12341001-14', thickness3: '0.750"',
      etRoot: 'Yes', etFinal: 'No',
    }));
    fixture.componentRef.setInput('currentRouting', 'Fit');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const t of ['Material 1', 'Material 2', 'Material 3', '04-AS', 'S12341001-14', '0.750"', 'ET Root', 'ET Final']) expect(text).toContain(t);
    expect(text).not.toContain('Pipe Size');
    expect(text).not.toContain('Wall Thickness');
  });
});
