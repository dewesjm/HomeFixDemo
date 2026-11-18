import { TestBed } from '@angular/core/testing';
import { JOBS } from '../../data/jobs';
import { JointRecordEditsService } from './joint-record-edits.service';
import { ViewerService } from '../access-logic/viewer.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { setRoutingFrom } from '../routing-logic/current-routing';

describe('JointRecordEditsService', () => {
  let svc: JointRecordEditsService;
  const withXref = JOBS.find(j => j.xrefid)!;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(JointRecordEditsService);
  });

  afterEach(() => localStorage.clear());

  it('validates fabrication writes and treats an unchanged value as a no-op', () => {
    const key = { xrefid: withXref.xrefid };
    const workflow = TestBed.inject(WorkflowStore).workflowFor(withXref);
    workflow.update(wf => ({
      ...wf,
      stages: setRoutingFrom(wf.stages.map(s => s.id === 'fit'
        ? { ...s, required: true, signed: false } : s), 'fit'),
    }));
    const viewer = TestBed.inject(ViewerService);
    viewer.select('view');
    expect(svc.setFabricationData(key, 'weldMemo', 'M-42')).toEqual(jasmine.objectContaining({ ok: false, title: 'Access denied' }));
    viewer.select('fitter');
    const before = workflow().history.length;
    expect(svc.setFabricationData(key, 'unknown', 'M-42')).toEqual(jasmine.objectContaining({ ok: false, title: 'Wrong field' }));
    expect(svc.setFabricationData(key, 'location', 'unknown')).toEqual(jasmine.objectContaining({ ok: false, title: 'Wrong value' }));
    expect(svc.setFabricationData(key, 'weldMemo', 'M-42').ok).toBeTrue();
    expect(svc.setFabricationData(key, 'weldMemo', 'M-42').ok).toBeTrue();
    expect(workflow().fabricationData['weldMemo']).toBe('M-42');
    expect(workflow().history.slice(before).map(entry => entry.section)).toEqual(['Fabrication']);
  });
});
