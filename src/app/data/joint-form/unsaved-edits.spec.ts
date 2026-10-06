import { JOBS } from '../jobs';
import { JobWorkflow, WorkflowStage, newWorkflow } from '../workflow';
import { captureLoaded, hasUnsavedEdits, rebaselineAfterSignoff } from './unsaved-edits';

const job = JOBS.find(j => j.trade === 'Welding')!;
const none = () => ({});
const withStage = (wf: JobWorkflow, id: string, change: Partial<WorkflowStage>): JobWorkflow =>
  ({ ...wf, stages: wf.stages.map(s => s.id === id ? { ...s, ...change } : s) });

describe('joint-form unsaved-edits', () => {
  it('nothing changed since load: no unsaved edits', () => {
    const wf = newWorkflow(job);
    expect(hasUnsavedEdits(wf, captureLoaded(wf), none)).toBeFalse();
  });

  it('a value typed on an unsigned stage counts; on a signed stage it does not', () => {
    const wf = newWorkflow(job);
    const loaded = captureLoaded(wf);
    expect(hasUnsavedEdits(withStage(wf, 'tack', { inputs: { comments: 'x' } }), loaded, none)).toBeTrue();
    expect(hasUnsavedEdits(withStage(wf, 'tack', { inputs: { comments: 'x' }, signed: true }), loaded, none)).toBeFalse();
    expect(hasUnsavedEdits(withStage(wf, 'fit', { signoffInputs: { deferTack: 'yes' } }), loaded, none)).toBeTrue();
    expect(hasUnsavedEdits(withStage(wf, 'fit', { signoffType: 'weld-buildup' }), loaded, none)).toBeTrue();
  });

  it('what a sign-off changed (a route-back) is not unsaved; what was typed elsewhere still is', () => {
    const wf = withStage(newWorkflow(job), 'tack', { inputs: { weldProcedure: 'W-101' } });
    const loaded = captureLoaded(wf);
    const typed = withStage(wf, 'fit', { inputs: { comments: 'x' } });
    const signed = withStage(typed, 'tack', { inputs: {} });
    rebaselineAfterSignoff(loaded, typed, signed);
    expect(hasUnsavedEdits(withStage(signed, 'fit', { inputs: {} }), loaded, none)).toBeFalse();
    expect(hasUnsavedEdits(signed, loaded, none)).toBeTrue();
  });

  it('a blank value and a missing key are the same', () => {
    const wf = newWorkflow(job);
    expect(hasUnsavedEdits(withStage(wf, 'tack', { inputs: { comments: '' } }), captureLoaded(wf), none)).toBeFalse();
  });

  it('values that survive leaving (an engineering override) do not count', () => {
    const wf = newWorkflow(job);
    const edited = withStage(wf, 'tack', { inputs: { weldProcedure: 'W-101' } });
    expect(hasUnsavedEdits(edited, captureLoaded(wf), (s): Record<string, string> => s.id === 'tack' ? { weldProcedure: 'W-101' } : {})).toBeFalse();
  });

  it('Fabrication edits count until Fit is signed', () => {
    const wf = newWorkflow(job);
    const loaded = captureLoaded(wf);
    const fabEdited = { ...wf, fabricationData: { ...wf.fabricationData, actualThickness: '0.3' } };
    expect(hasUnsavedEdits(fabEdited, loaded, none)).toBeTrue();
    expect(hasUnsavedEdits(withStage(fabEdited, 'fit', { signed: true }), loaded, none)).toBeFalse();
  });

  it('the loaded copy is not changed by later edits to the workflow', () => {
    const wf = newWorkflow(job);
    const loaded = captureLoaded(wf);
    wf.stages.find(s => s.id === 'tack')!.inputs['comments'] = 'mutated';
    expect(loaded.stages['tack'].inputs['comments']).toBeUndefined();
  });
});
