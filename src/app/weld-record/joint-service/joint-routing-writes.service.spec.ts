import { TestBed } from '@angular/core/testing';
import { JOBS } from '../../data/jobs';
import { JointRoutingWritesService } from './joint-routing-writes.service';
import { ViewerService } from '../access-logic/viewer.service';
import { SignoffService } from '../services/signoff.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { activeStageId, currentRoutingLabel, setRoutingFrom } from '../routing-logic/current-routing';

describe('JointRoutingWritesService', () => {
  let svc: JointRoutingWritesService;
  let viewer: ViewerService;
  const job = JOBS.find(j => j.xrefid)!;
  const key = { xrefid: job.xrefid };
  const workflow = () => TestBed.inject(WorkflowStore).workflowFor(job);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(JointRoutingWritesService);
    viewer = TestBed.inject(ViewerService);
    viewer.select('developer');
    /* the joint waits at Fit */
    workflow().update(wf => ({
      ...wf,
      stages: setRoutingFrom(wf.stages.map(s => s.id === 'fit' ? { ...s, required: true, signed: false } : s), 'fit'),
    }));
  });

  afterEach(() => localStorage.clear());

  it('deprogress needs permission and a reason, then undoes the latest signoff', () => {
    viewer.select('view');
    expect(svc.deprogress(key, 'Wrong joint')).toEqual(jasmine.objectContaining({ ok: false, title: 'Access denied' }));
    viewer.select('developer');
    expect(svc.deprogress(key, '  ')).toEqual(jasmine.objectContaining({ ok: false, title: 'Reason required' }));

    const atFit = currentRoutingLabel(workflow()().stages);
    expect(TestBed.inject(SignoffService).signStage(job, 'fit')).toBeTrue();
    expect(activeStageId(workflow()().stages)).not.toBe('fit');
    expect(svc.deprogress(key, 'Wrong joint')).toEqual({ ok: true, data: { routing: atFit } });
    expect(activeStageId(workflow()().stages)).toBe('fit');
  });

  it('setRouting needs permission, a reason and another required routing', () => {
    const target = workflow()().stages.find((s, i, all) => s.required && i > all.findIndex(x => x.id === 'fit'))!;
    viewer.select('view');
    expect(svc.setRouting(key, target.id, 'Override')).toEqual(jasmine.objectContaining({ ok: false, title: 'Access denied' }));
    viewer.select('developer');
    expect(svc.setRouting(key, target.id, '')).toEqual(jasmine.objectContaining({ ok: false, title: 'Reason required' }));
    expect(svc.setRouting(key, 'fit', 'Override')).toEqual(jasmine.objectContaining({ ok: false, title: 'Invalid target' }));
    expect(svc.setRouting(key, 'no-such-routing', 'Override')).toEqual(jasmine.objectContaining({ ok: false, title: 'Invalid target' }));

    /* forward only moves the flag: the joint lands on the first unsigned routing from the target */
    const result = svc.setRouting(key, target.id, 'Override');
    expect(activeStageId(workflow()().stages)).not.toBe('fit');
    expect(result).toEqual({ ok: true, data: { routing: currentRoutingLabel(workflow()().stages) } });
  });

  it('answers an unknown joint as not found', () => {
    expect(svc.deprogress({ xrefid: 'NO-SUCH-JOINT' }, 'x')).toEqual(jasmine.objectContaining({ ok: false, title: 'Not found' }));
  });
});
