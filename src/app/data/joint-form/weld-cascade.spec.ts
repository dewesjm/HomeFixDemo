import { JOBS } from '../jobs';
import { buildStages, WorkflowStage, fillChanges } from '../workflow';
import { procedures } from '../procedures';
import { selectChangeCascade, typedRequirementChanges, FieldChange } from './weld-cascade';

const job = JOBS.find(j => j.trade === 'Welding')!;
const stageOf = (id: string, change: Partial<WorkflowStage> = {}): WorkflowStage => ({ ...buildStages(job).find(s => s.id === id)!, ...change });
const field = (s: WorkflowStage, key: string) => s.fields.find(f => f.key === key)!;
const asRecord = (changes: FieldChange[]) => Object.fromEntries(changes.map(c => [c.field.key, c.value]));

describe('joint-form weld-cascade', () => {
  it('a new GWP clears WTN and everything WTN drove, but leaves filler alone while Consumable Insert fills it', () => {
    const tack = stageOf('tack', { inputs: { wtn: '1', phMin: '50', actualPhMin: 'NC', actualIpMin: '75', fillerMetalType: 'mil-70s-3' } });
    const { changes, matchedProc } = selectChangeCascade(tack, field(tack, 'weldProcedure'), 'W-102', false);
    const set = asRecord(changes);
    expect(matchedProc).toBeFalse();
    expect(set).toEqual(jasmine.objectContaining({ weldProcedure: 'W-102', wtn: '', weldProcess: '', phMin: '', actualPhMin: '', fillerMetalType: '' }));
    expect('actualIpMin' in set).toBeFalse();
    const root = stageOf('root-weld', { inputs: { consumableInsertOnly: 'yes', fillerMetalType: 'mil-70s-3' } });
    expect('fillerMetalType' in asRecord(selectChangeCascade(root, field(root, 'weldProcedure'), 'W-102', false).changes)).toBeFalse();
  });

  it('a WTN fills in its WPS\'s process and PH/IP requirements, and NC requirements lock their actuals', () => {
    const proc = procedures().find(p => p.phMin === 'NC')!;
    const tack = stageOf('tack', { inputs: { weldProcedure: proc.gwp } });
    const { changes, matchedProc } = selectChangeCascade(tack, field(tack, 'wtn'), proc.wtn, false);
    const set = asRecord(changes);
    expect(matchedProc).toBeTrue();
    expect(set['weldProcess']).toBe(proc.weldProcess.toLowerCase());
    expect(set['phMax']).toBe(proc.phMax);
    expect(set['actualPhMin']).toBe('NC');
  });

  it('a WTN clears a filler choice its WPS does not allow, unless a Foreman Override opened the list', () => {
    const proc = procedures().find(p => !p.fillerMetalTypes.includes('mil-100s-1'))!;
    const tack = stageOf('tack', { inputs: { weldProcedure: proc.gwp, fillerMetalType: 'mil-100s-1' } });
    expect(asRecord(selectChangeCascade(tack, field(tack, 'wtn'), proc.wtn, false).changes)['fillerMetalType']).toBe('');
    expect('fillerMetalType' in asRecord(selectChangeCascade(tack, field(tack, 'wtn'), proc.wtn, true).changes)).toBeFalse();
  });

  it('a typed requirement: NC normalized and copied to its actuals, a number frees an NC actual, unchanged is nothing', () => {
    const tack = stageOf('tack', { inputs: { phMin: '50', actualPhMin: 'NC' } });
    expect(asRecord(typedRequirementChanges(tack, field(tack, 'phMin'), ' nc '))).toEqual({ phMin: 'NC', actualPhMin: 'NC' });
    expect(asRecord(typedRequirementChanges(tack, field(tack, 'phMin'), '60'))).toEqual({ phMin: '60', actualPhMin: '' });
    expect(typedRequirementChanges(tack, field(tack, 'phMin'), '50')).toEqual([]);
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
});
