import { TestBed } from '@angular/core/testing';
import { JOBS } from '../../data/jobs';
import { JointSignoffService } from './joint-signoff.service';
import { ViewerService } from '../access-logic/viewer.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { activeStageId, setRoutingFrom } from '../routing-logic/current-routing';

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

  it('signs only the current routing, and sends Fit-Up Release to releaseToWelding', () => {
    const key = { xrefid: withXref.xrefid };
    const workflow = TestBed.inject(WorkflowStore).workflowFor(withXref);
    const waitAt = (id: string) => workflow.update(wf => ({
      ...wf,
      stages: setRoutingFrom(wf.stages.map(s => s.id === id ? { ...s, required: true, signed: false } : s), id),
    }));
    const viewer = TestBed.inject(ViewerService);
    waitAt('fit');
    viewer.select('developer');
    expect(svc.signRouting(key, 'tack')).toEqual(jasmine.objectContaining({ ok: false, title: 'Signoff blocked' }));
    viewer.select('view');
    expect(svc.signRouting(key, 'fit')).toEqual(jasmine.objectContaining({ ok: false, title: 'Access denied' }));

    waitAt('fitup-release');
    viewer.select('developer');
    expect(svc.signRouting(key, 'fitup-release')).toEqual(jasmine.objectContaining({ ok: false, title: 'Signoff blocked' }));
    expect(activeStageId(workflow().stages)).toBe('fitup-release');
  });
});
