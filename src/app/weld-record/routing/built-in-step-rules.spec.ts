import { Job } from '../../data/jobs';
import { WorkflowStage } from '../model/workflow-types';
import {
  blocksOnFabricationErrors, closesJoint, closingRole, goesBackPastFabrication, inspectingLabel, isPhaseNdtId,
  needsFabricationComplete, noCommentsBox, rtDegreeRequired, unsatAddsRepair,
} from './built-in-step-rules';

const st = (id: string, extra: Partial<WorkflowStage> = {}) => ({ id, ...extra }) as WorkflowStage;

describe('built-in step rules', () => {
  it('Fit needs complete Fabrication; Fit-Up Insp (either row) blocks only on its errors', () => {
    expect(needsFabricationComplete('fit')).toBeTrue();
    expect(needsFabricationComplete('fitup-insp')).toBeFalse();
    expect(blocksOnFabricationErrors('fitup-insp')).toBeTrue();
    expect(blocksOnFabricationErrors('nqc-fitup-insp')).toBeTrue();
    expect(blocksOnFabricationErrors('fit')).toBeFalse();
  });

  it('going back to Fit or earlier blanks Fabrication', () => {
    const stages = ['pre-fit', 'fit', 'tack'].map(id => st(id));
    expect(goesBackPastFabrication(stages, 0)).toBeTrue();
    expect(goesBackPastFabrication(stages, 1)).toBeTrue();
    expect(goesBackPastFabrication(stages, 2)).toBeFalse();
    expect(goesBackPastFabrication([st('tack')], 0)).toBeFalse();
  });

  it('RT degree required: Root from rtRoot, Final from rtFinal, Layer none', () => {
    const j = { rtRoot: '360', rtFinal: '60' } as Job;
    expect(rtDegreeRequired(j, st('root-ndt-utrt'))).toBe('360');
    expect(rtDegreeRequired(j, st('nqc-final-ndt-utrt'))).toBe('60');
    expect(rtDegreeRequired(j, st('layer-ndt-utrt'))).toBe('');
  });

  it('NDT steps: phase NDT ids, and UNSAT adds a Repair except on Excavation NDT', () => {
    expect(isPhaseNdtId('nqc-root-ndt-vt5x')).toBeTrue();
    expect(isPhaseNdtId('excavation-ndt')).toBeFalse();
    expect(unsatAddsRepair('final-ndt-utrt')).toBeTrue();
    expect(unsatAddsRepair('excavation-ndt-2')).toBeFalse();
  });

  it('names what an inspection step inspects', () => {
    expect(inspectingLabel('root-ndt-utrt')).toBe('Root');
    expect(inspectingLabel('layer-ndt-vt5x')).toBe('Layer');
    expect(inspectingLabel('final-ndt-mtpt')).toBe('Final');
    expect(inspectingLabel('excavation-ndt-2')).toBe('Excavation');
    expect(inspectingLabel('fitup-insp')).toBe('Fit');
    expect(inspectingLabel('nqc-fitup-insp')).toBe('Fit');
    expect(inspectingLabel('root')).toBe('');
  });

  it('Sold closes the joint and follows the Records Review; it and Engineering Hold have no Comments box', () => {
    expect(closesJoint('sold')).toBeTrue();
    expect(closingRole(true)).toBe('O63 Records');
    expect(closingRole(false)).toBe('O04 Records');
    expect(noCommentsBox('sold')).toBeTrue();
    expect(noCommentsBox('engineering-hold-2')).toBeTrue();
    expect(noCommentsBox('fit')).toBeFalse();
  });
});
