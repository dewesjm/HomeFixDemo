import { JOBS } from '../../../data/jobs';
import { buildStages } from '../../routing/build-stages';
import { WorkflowStage } from '../../model/workflow-types';
import { fillChanges } from '../../signoff-definition/field-fill';
import { isFieldLocked } from '../../signoff-definition/field-locks';
import {
  getActivationForStep,
  setStepFieldConfig,
  resetStepFieldConfig,
} from '../../signoff-definition/step-field-config';
import { procedures } from '../../../data/procedures';
import { selectChangeCascade, typedRequirementChanges, FieldChange } from './weld-cascade';

const job = JOBS.find(j => j.trade === 'Welding')!;
const stageOf = (id: string, change: Partial<WorkflowStage> = {}): WorkflowStage => ({ ...buildStages(job).find(s => s.id === id)!, ...change });
const field = (s: WorkflowStage, key: string) => s.fields.find(f => f.key === key)!;
const asRecord = (changes: FieldChange[]) => Object.fromEntries(changes.map(c => [c.field.key, c.value]));

describe('joint-form weld-cascade', () => {
  /* the cascade's changes on the step, then its fill rules, as the joint page applies them */
  const afterChange = (before: WorkflowStage, changes: FieldChange[]): Record<string, string> => {
    const after = { ...before, inputs: { ...before.inputs, ...asRecord(changes) } };
    return { ...after.inputs, ...fillChanges(before, after, [after]).values };
  };

  it('a new GWP clears WTN and everything WTN drove, but leaves filler alone while Consumable Insert fills it', () => {
    const tack = stageOf('tack', { inputs: { wtn: '1', weldProcess: 'gtaw', phMin: 'NC', actualPhMin: 'NC', actualIpMin: '75', fillerMetalType: 'mil-70s-3' } });
    const { changes, matchedProc } = selectChangeCascade(tack, field(tack, 'weldProcedure'), 'W-102', false);
    expect(matchedProc).toBeFalse();
    expect(afterChange(tack, changes)).toEqual(jasmine.objectContaining(
      { weldProcedure: 'W-102', wtn: '', weldProcess: '', phMin: '', actualPhMin: '', actualIpMin: '75', fillerMetalType: '' }));
    const root = stageOf('root-weld', { inputs: { consumableInsertOnly: 'yes', fillerMetalType: 'mil-70s-3' } });
    expect('fillerMetalType' in asRecord(selectChangeCascade(root, field(root, 'weldProcedure'), 'W-102', false).changes)).toBeFalse();
  });

  it('a WTN fills in its WPS\'s process and PH/IP requirements, and NC requirements lock their actuals', () => {
    const proc = procedures().find(p => p.phMin === 'NC')!;
    const tack = stageOf('tack', { inputs: { weldProcedure: proc.gwp } });
    const { changes, matchedProc } = selectChangeCascade(tack, field(tack, 'wtn'), proc.wtn, false);
    const set = afterChange(tack, changes);
    expect(matchedProc).toBeTrue();
    expect(set['weldProcess']).toBe(proc.weldProcess.toLowerCase());
    expect(set['phMax']).toBe(proc.phMax);
    expect(set['actualPhMin']).toBe('NC');
    const filled = { ...tack, inputs: set };
    expect(isFieldLocked(filled, { key: 'actualPhMin' })).toBeTrue();
    expect(isFieldLocked(filled, { key: 'weldProcess' })).toBeTrue();
    expect(isFieldLocked({ ...filled, engineeringEntry: true }, { key: 'weldProcess' })).toBeFalse();
  });

  it('a WTN clears a filler choice its WPS does not allow, unless a Foreman Override opened the list', () => {
    const proc = procedures().find(p => !p.fillerMetalTypes.includes('mil-100s-1'))!;
    const tack = stageOf('tack', { inputs: { weldProcedure: proc.gwp, fillerMetalType: 'mil-100s-1' } });
    expect(asRecord(selectChangeCascade(tack, field(tack, 'wtn'), proc.wtn, false).changes)['fillerMetalType']).toBe('');
    expect('fillerMetalType' in asRecord(selectChangeCascade(tack, field(tack, 'wtn'), proc.wtn, true).changes)).toBeFalse();
  });

  it('a typed requirement: NC normalized and copied to its actuals, a number frees an NC actual, unchanged is nothing', () => {
    const typed = stageOf('tack', { engineeringEntry: true, inputs: { phMin: '50', actualPhMin: '70' } });
    const nc = afterChange(typed, typedRequirementChanges(typed, field(typed, 'phMin'), ' nc '));
    expect(nc).toEqual(jasmine.objectContaining({ phMin: 'NC', actualPhMin: 'NC' }));
    const ncStage = { ...typed, inputs: nc };
    expect(afterChange(ncStage, typedRequirementChanges(ncStage, field(ncStage, 'phMin'), '60')))
      .toEqual(jasmine.objectContaining({ phMin: '60', actualPhMin: '' }));
    expect(typedRequirementChanges(typed, field(typed, 'phMin'), '50')).toEqual([]);
  });

  it('Only Consumable Insert fills Root\'s filler from Fit (only the values Fit has) and unchecking blanks it', () => {
    const fit = stageOf('fit', { signoffInputs: { consumableInsertType: 'mil-70s-6', consumableInsertSize: '1/8' } });
    const off = stageOf('root-weld', { inputs: { fillerMetalType: 'mil-70s-3', fillerMetalMic: 'M1' } });
    const on = { ...off, inputs: { ...off.inputs, consumableInsertOnly: 'yes' } };
    expect(fillChanges(off, on, [fit, on])).toEqual({ values: { fillerMetalType: 'mil-70s-6', fillerMetalSize: '1/8' }, released: [] });
    expect(fillChanges(on, on, [on]).values).toEqual({});
    const filled = { ...on, inputs: { ...on.inputs, fillerMetalType: 'mil-70s-6', fillerMetalSize: '1/8' } };
    const unchecked = { ...filled, inputs: { ...filled.inputs, consumableInsertOnly: '' } };
    const result = fillChanges(filled, unchecked, [fit, unchecked]);
    expect(result.released).toEqual(['fillerMetalType', 'fillerMetalSize', 'fillerMetalMic']);
    expect(result.values).toEqual({ fillerMetalType: '', fillerMetalSize: '', fillerMetalMic: '' });
  });

  describe('a prepopulated field that is never disabled', () => {
    afterEach(() => resetStepFieldConfig());

    it('is copied in when its rule starts holding, then keeps a value typed over it', () => {
      const tack = getActivationForStep('tack');
      setStepFieldConfig([{ ...tack, fields: tack.fields.map(f => f.key === 'actualPhMin' ? { ...f, disabledIf: { all: [] } } : f) }]);
      /* an engineering override, so PH Min is typed rather than prepopulated from the WTN */
      const before = stageOf('tack', { engineeringEntry: true, inputs: { phMin: '50', actualPhMin: '70' } });
      const nc = { ...before, inputs: { ...before.inputs, phMin: 'NC' } };
      expect(fillChanges(before, nc, [nc]).values).toEqual({ actualPhMin: 'NC' });
      const typedOver = { ...nc, inputs: { ...nc.inputs, actualPhMin: '80' } };
      expect(isFieldLocked(typedOver, { key: 'actualPhMin' })).toBeFalse();
      expect(fillChanges(typedOver, { ...typedOver, inputs: { ...typedOver.inputs, ipMin: '60' } }, [typedOver]).values).toEqual({});
    });
  });
});
