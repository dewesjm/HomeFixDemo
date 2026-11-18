import { TestBed } from '@angular/core/testing';
import { JOBS } from '../../data/jobs';
import { JointSignoffService } from './joint-signoff.service';
import { ViewerService } from '../access-logic/viewer.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { setRoutingFrom } from '../routing-logic/current-routing';

describe('JointSignoffService', () => {
  let svc: JointSignoffService;
  const withXref = JOBS.find(j => j.xrefid)!;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(JointSignoffService);
  });

  afterEach(() => localStorage.clear());

  it('releases only at Fit-Up Release and records one release when retried', () => {
    const key = { xrefid: withXref.xrefid };
    const workflow = TestBed.inject(WorkflowStore).workflowFor(withXref);
    workflow.update(wf => ({
      ...wf,
      stages: setRoutingFrom(wf.stages.map(s => s.id === 'fitup-release'
        ? { ...s, required: true, signed: false } : s), 'fitup-release'),
    }));
    const viewer = TestBed.inject(ViewerService);
    viewer.select('view');
    expect(svc.releaseToWelding(key)).toEqual(jasmine.objectContaining({ ok: false, title: 'Access denied' }));
    viewer.select('foreman');
    const before = workflow().history.length;
    expect(svc.releaseToWelding(key).ok).toBeTrue();
    expect(svc.releaseToWelding(key)).toEqual(jasmine.objectContaining({ ok: false, title: 'Wrong routing' }));
    expect(workflow().history.slice(before).map(entry => entry.section)).toEqual(['Release']);
  });
});
