import { TestBed } from '@angular/core/testing';
import { JOBS, type Job } from '../../data/jobs';
import { JOINT_FIELDS, JointService, findJoint } from './joint-service';
import { jointUrl } from '../joint-page/joint-route';
import { ViewerService } from '../access-logic/viewer.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { setRoutingFrom } from '../routing-logic/current-routing';

const job = (o: Partial<Job>): Job => ({ ...JOBS[0], ...o });

describe('JointService', () => {
  let svc: JointService;
  const withXref = JOBS.find(j => j.xrefid)!;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(JointService);
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

  describe('findJoint', () => {
    const jobs = [
      job({ id: 'a', xrefid: 'X1', hull: 'S1', drawing: 'D1', joint: 'J1' }),
      job({ id: 'b', xrefid: '', hull: 'S1', drawing: 'D1', joint: 'J2' }),
      job({ id: 'c', xrefid: '', hull: 'S1', drawing: 'D1', joint: 'J2' }),
    ];
    it('finds by XREFID ignoring case', () => {
      const r = findJoint({ xrefid: 'x1' }, jobs);
      expect(r.ok && r.data.id).toBe('a');
    });
    it('finds by hull + drawing + joint', () => {
      const r = findJoint({ hull: 'S1', drawing: 'D1', joint: 'J1' }, jobs);
      expect(r.ok && r.data.id).toBe('a');
    });
    it('needs all three parts without an XREFID', () => {
      expect(findJoint({ hull: 'S1' }, jobs)).toEqual({ ok: false, error: 'Give an XREFID, or hull, drawing and joint.', title: 'Key missing' });
    });
    it('refuses when several joints match', () => {
      expect(findJoint({ hull: 'S1', drawing: 'D1', joint: 'J2' }, jobs)).toEqual(jasmine.objectContaining({ ok: false, title: 'More than one joint' }));
    });
    it('says when nothing matches', () => {
      expect(findJoint({ xrefid: 'nope' }, jobs)).toEqual({ ok: false, error: 'There is no joint XREFID nope.', title: 'Not found' });
    });
  });

  it('getJoint answers the record without the internal id, with its routing', () => {
    const r = svc.getJoint({ xrefid: withXref.xrefid });
    expect(r.ok).toBeTrue();
    if (!r.ok) return;
    expect('id' in r.data).toBeFalse();
    expect(r.data.xrefid).toBe(withXref.xrefid);
    expect(r.data.routing).toBeTruthy();
  });

  it('getRouting marks at most one routing current, matching current', () => {
    const r = svc.getRouting({ xrefid: withXref.xrefid });
    expect(r.ok).toBeTrue();
    if (!r.ok) return;
    const current = r.data.routings.filter(s => s.current);
    expect(current.length).toBeLessThanOrEqual(1);
    if (current.length) expect(current[0].label).toBeTruthy();
  });

  it('getHistory answers newest first and filters by section', () => {
    const all = svc.getHistory({ xrefid: withXref.xrefid });
    expect(all.ok).toBeTrue();
    if (!all.ok) return;
    const whens = all.data.entries.map(e => e.when);
    expect(whens).toEqual([...whens].sort().reverse());
    const signoffs = svc.getHistory({ xrefid: withXref.xrefid }, { section: 'Sign-off' });
    expect(signoffs.ok && signoffs.data.entries.every(e => e.section === 'Sign-off')).toBeTrue();
  });

  it('getHistory refuses an unknown section', () => {
    const r = svc.getHistory({ xrefid: withXref.xrefid }, { section: 'Nope' as never });
    expect(r).toEqual(jasmine.objectContaining({ ok: false, title: 'Wrong value' }));
  });

  it('jointUrl builds the full Joint Details link with each part encoded', () => {
    expect(jointUrl({ hull: 'S1', drawing: 'H 1/2', joint: 'ST-1' }, 'https://example.test/app/'))
      .toBe('https://example.test/app/jobs/S1/H%201%2F2/ST-1');
  });

  it('getJoint carries its Joint Details link', () => {
    const r = svc.getJoint({ hull: withXref.hull, drawing: withXref.drawing, joint: withXref.joint });
    expect(r.ok && r.data.url).toBe(jointUrl(withXref));
  });

  describe('findJoints', () => {
    it('matches every condition exactly, ignoring case', () => {
      const r = svc.findJoints({ hull: withXref.hull.toLowerCase(), drawing: withXref.drawing });
      expect(r.ok).toBeTrue();
      if (!r.ok) return;
      const expected = JOBS.filter(j => j.hull === withXref.hull && j.drawing === withXref.drawing).length;
      expect(r.data.count).toBe(expected);
      expect(r.data.joints.every(j => j.hull === withXref.hull && !!j.url)).toBeTrue();
    });
    it('filters on the current routing', () => {
      const routing = (svc.getJoint({ xrefid: withXref.xrefid }) as { ok: true; data: { routing: string } }).data.routing;
      const r = svc.findJoints({ routing });
      expect(r.ok && r.data.joints.every(j => j.routing === routing) && r.data.count > 0).toBeTrue();
    });
    it('refuses an unknown field and never offers the internal id', () => {
      expect(svc.findJoints({ id: 'x' } as never)).toEqual(jasmine.objectContaining({ ok: false, title: 'Wrong value' }));
      expect(svc.findJoints({ nope: 'x' } as never)).toEqual(jasmine.objectContaining({ ok: false, title: 'Wrong value' }));
    });
    it('openOnly leaves out joints at Sold', () => {
      const all = svc.findJoints();
      const open = svc.findJoints({}, { openOnly: true });
      expect(all.ok && open.ok).toBeTrue();
      if (!all.ok || !open.ok) return;
      expect(open.data.joints.some(j => j.routing === 'Sold')).toBeFalse();
      expect(open.data.count).toBeLessThanOrEqual(all.data.count);
    });
  });

  describe('searchJoints', () => {
    it('answers every joint with a total when nothing is sent', () => {
      const r = svc.searchJoints();
      expect(r.ok && r.data.total).toBe(JOBS.length);
    });
    it('pages, sorts and filters by a list of values', () => {
      const r = svc.searchJoints({ filters: { weldType: ['butt'] }, sort: { by: 'joint', order: 'desc' }, page: 2, pageSize: 5 });
      expect(r.ok).toBeTrue();
      if (!r.ok) return;
      expect(r.data.page).toBe(2);
      expect(r.data.joints.length).toBeLessThanOrEqual(5);
      expect(r.data.joints.every(j => j.weldType === 'Butt' && !!j.url)).toBeTrue();
      const joints = r.data.joints.map(j => j.joint);
      expect(joints).toEqual([...joints].sort().reverse());
    });
    it('search text looks in the drawing', () => {
      const r = svc.searchJoints({ text: withXref.drawing });
      expect(r.ok && r.data.joints.every(j => j.drawing === withXref.drawing || j.xrefid.includes(withXref.drawing) || j.joint.includes(withXref.drawing) || j.routing.includes(withXref.drawing) || j.technician.includes(withXref.drawing) || j.hull.includes(withXref.drawing))).toBeTrue();
    });
    it('refuses a bad query', () => {
      expect(svc.searchJoints({ page: 1 })).toEqual({ ok: false, error: 'Send pageSize with page.', title: 'Wrong value' });
      expect(svc.searchJoints({ filters: { nope: 'x' } as never })).toEqual(jasmine.objectContaining({ ok: false, title: 'Wrong value' }));
    });
  });

  describe('getJointFields', () => {
    const fields = () => { const r = svc.getJointFields(); return r.ok ? r.data.fields : []; };
    it('lists exactly the keys findJoints takes, never the internal id', () => {
      const keys = fields().map(f => f.key).sort();
      expect(keys).toEqual([...JOINT_FIELDS].sort());
      expect(keys).not.toContain('id');
    });
    it('labels fields as Joint Details does and marks searchJoints columns', () => {
      const routing = fields().find(f => f.key === 'routing')!;
      expect(routing.label).toBe('Routing');
      expect(routing.searchColumn).toBeTrue();
      expect(fields().find(f => f.key === 'drawingRev')!.searchColumn).toBeFalse();
      expect(fields().find(f => f.key === 'technician')!.label).toBe('Technician');
      expect(fields().find(f => f.key === 'estimatedHours')!.type).toBe('number');
    });
    it('gives list fields the values joints have, sorted', () => {
      const weldType = fields().find(f => f.key === 'weldType')!;
      expect(weldType.choices).toEqual([...new Set(JOBS.map(j => j.weldType))].filter(Boolean).sort());
      expect(fields().find(f => f.key === 'drawing')!.choices).toBeUndefined();
    });
  });
});
