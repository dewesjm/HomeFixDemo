import { TestBed } from '@angular/core/testing';
import { JOBS, type Job } from '../../data/jobs';
import { JointService, findJoint } from './joint-service';

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
});
