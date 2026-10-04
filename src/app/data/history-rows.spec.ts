import { HistoryEntry, JobWorkflow, WorkflowStage, correctableKeys, deprogressableKey, historyRows } from './workflow';
import { JOBS } from './jobs';

const job = JOBS[1];

function entry(when: string, section: HistoryEntry['section'], action: string, stageId?: string): HistoryEntry {
  return { when, who: 'A. Person', section, action, routing: 'Fit', stageId };
}

function workflow(history: HistoryEntry[], signed: string[], undoWhen?: string): JobWorkflow {
  const stages = ['pre-fit', 'fit', 'tack'].map(id => ({ id, label: id, signed: signed.includes(id) }) as WorkflowStage);
  return {
    jobId: job.id, technician: '', stages, attachments: [], conditionCode: '', conditionCount: 0,
    history, fabricationData: {},
    undo: undoWhen ? [{ stageId: 'fit', historyWhen: undoWhen, stages: [], fabricationData: {}, refitNumber: '', repairNumber: '' }] : [],
  };
}

describe('historyRows', () => {
  it('leaves out per-field edits, sorts newest first and carries the joint\'s identifiers', () => {
    const wf = workflow([
      entry('2026-01-01T08:00:00Z', 'Sign-off', 'pre-fit - Signed off', 'pre-fit'),
      entry('2026-01-01T09:00:00Z', 'Stages', 'PPE'),
      entry('2026-01-01T09:30:00Z', 'Fabrication', 'Location'),
      { ...entry('2026-01-01T10:00:00Z', 'Sign-off', 'fit - Signed off', 'fit'), inputs: [{ label: 'Gap', value: '3' }] },
    ], ['pre-fit', 'fit']);
    const rows = historyRows(wf, job);
    expect(rows.map(r => r.action)).toEqual(['fit - Signed off', 'pre-fit - Signed off']);
    expect(rows[0].drawing).toBe(job.drawing);
    expect(rows[0].inputsText).toBe('Gap 3');
  });
});

describe('Deprogress and Correct', () => {
  const preFit = entry('2026-01-01T08:00:00Z', 'Sign-off', 'pre-fit - Signed off', 'pre-fit');
  const fit = entry('2026-01-01T10:00:00Z', 'Sign-off', 'fit - Signed off', 'fit');
  const fitBack = entry('2026-01-01T11:00:00Z', 'Sign-off', 'fit - Deprogressed: wrong', 'fit');
  const key = (e: HistoryEntry) => `${job.id}|${e.when}|${e.action}`;

  it('without undo entries, Deprogress is on the last sign-off still in effect', () => {
    const wf = workflow([preFit, fit], ['pre-fit', 'fit']);
    expect(deprogressableKey(wf, historyRows(wf, job))).toBe(key(fit));
    const after = workflow([preFit, fit, fitBack], ['pre-fit']);
    expect(deprogressableKey(after, historyRows(after, job))).toBe(key(preFit));
  });

  it('is not offered when the last sign-off is not the last signed stage', () => {
    const wf = workflow([preFit, fit], ['pre-fit']);
    expect(deprogressableKey(wf, historyRows(wf, job))).toBeUndefined();
  });

  it('with undo entries, Deprogress is on the sign-off the newest undo entry belongs to', () => {
    const wf = workflow([preFit, fit], ['pre-fit', 'fit'], preFit.when);
    expect(deprogressableKey(wf, historyRows(wf, job))).toBe(key(preFit));
  });

  it('Correct is on each signed stage\'s latest sign-off, never on a deprogress', () => {
    const wf = workflow([preFit, fit], ['pre-fit', 'fit']);
    expect(correctableKeys(wf, historyRows(wf, job)).sort()).toEqual([key(fit), key(preFit)].sort());
    const after = workflow([preFit, fit, fitBack], ['pre-fit']);
    expect(correctableKeys(after, historyRows(after, job))).toEqual([key(preFit)]);
  });
});
