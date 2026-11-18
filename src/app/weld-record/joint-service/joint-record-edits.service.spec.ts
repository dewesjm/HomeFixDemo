import { TestBed } from '@angular/core/testing';
import { JOBS } from '../../data/jobs';
import { JointRecordEditsService } from './joint-record-edits.service';
import { ViewerService } from '../access-logic/viewer.service';
import { SignoffService } from '../services/signoff.service';
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

  it('corrects only a signed routing, with grouped string values', () => {
    const key = { xrefid: withXref.xrefid };
    const workflow = TestBed.inject(WorkflowStore).workflowFor(withXref);
    workflow.update(wf => ({
      ...wf,
      stages: setRoutingFrom(wf.stages.map(s => s.id === 'fit' ? { ...s, required: true, signed: false } : s), 'fit'),
    }));
    const viewer = TestBed.inject(ViewerService);
    const refused = (title: string) => jasmine.objectContaining({ ok: false, title });
    viewer.select('view');
    expect(svc.correctRouting(key, 'fit', { inputs: {} }, 'Typo')).toEqual(refused('Access denied'));
    viewer.select('developer');
    expect(svc.correctRouting(key, 'fit', { inputs: {} }, ' ')).toEqual(refused('Reason required'));
    expect(svc.correctRouting(key, 'fit', { inputs: {} }, 'Typo')).toEqual(refused('Wrong routing'));

    expect(TestBed.inject(SignoffService).signStage(withXref, 'fit')).toBeTrue();
    expect(svc.correctRouting(key, 'fit', 'not an object', 'Typo')).toEqual(refused('Invalid changes'));
    expect(svc.correctRouting(key, 'fit', { other: {} }, 'Typo')).toEqual(refused('Invalid changes'));
    expect(svc.correctRouting(key, 'fit', { inputs: { noSuchField: 'x' } }, 'Typo')).toEqual(refused('Invalid field'));
    expect(svc.correctRouting(key, 'fit', { inputs: {} }, 'Typo')).toEqual(refused('No changes'));
  });

  it('adds and removes references by ID', () => {
    const key = { xrefid: withXref.xrefid };
    const viewer = TestBed.inject(ViewerService);
    const refused = (title: string) => jasmine.objectContaining({ ok: false, title });
    viewer.select('view');
    expect(svc.addReference(key, 'a.pdf')).toEqual(refused('Access denied'));
    viewer.select('developer');
    expect(svc.addReference(key, ' ')).toEqual(refused('Name required'));

    const added = svc.addReference(key, ' a.pdf ');
    if (!added.ok) throw new Error(added.error);
    const ref = added.data.references.find(r => r.name === 'a.pdf')!;
    expect(ref).toBeDefined();
    const removed = svc.removeReference(key, ref.id);
    expect(removed.ok).toBeTrue();
    expect(removed.ok && removed.data.references.some(r => r.id === ref.id)).toBeFalse();
    expect(svc.removeReference(key, ref.id)).toEqual(refused('Not found'));
  });
});
