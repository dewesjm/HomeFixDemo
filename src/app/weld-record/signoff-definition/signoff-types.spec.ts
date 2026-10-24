import { JOBS } from '../../data/jobs';
import { buildStages } from '../routing/build-stages';
import { STORAGE } from '../../data/storage-keys';
import { excavationNdtStage, nextRepairStage } from '../routing/added-steps';
import { getSignoffTypeRows, setSignoffTypeRows, signoffTypeOptions, usesReturningInspectionType } from './signoff-types';
import { initialInspectionType, inspectionTypeRequired } from './stage-rules';
import { getRoutingSignoffTypes, setRoutingSignoffTypes } from './routing-signoff-types';

describe('Signoff Types By Routing', () => {
  it('retains return context when an exception condition needs the performed inspection Type', () => {
    setSignoffTypeRows([{ stepId: 'final-ndt-vt5x', types: [{ type: 'vt' }], typeExceptions: [
      { from: 'vt', to: '5x', when: [[{ field: 'self.returningInspectionType', op: 'is', values: ['5x'] }]] }] }]);
    expect(usesReturningInspectionType('final-ndt-vt5x')).toBeTrue();
    expect(signoffTypeOptions('final-ndt-vt5x', JOBS[0], { returningInspectionType: '5x' })?.[0].value).toBe('5x');
    expect(signoffTypeOptions('final-ndt-vt5x', JOBS[0])?.[0].value).toBe('vt');
  });
  it('replaces enabled configured Types once, merges duplicates and retains the default', () => {
    setSignoffTypeRows([{ stepId: 'fit', types: [{ type: 'vt', default: true }, { type: '5x' }],
      typeExceptions: [{ from: 'vt', to: '5x', when: [[{ field: 'nInd', op: 'is', values: ['3'] }]] },
        { from: '5x', to: 'pt', when: [[{ field: 'nInd', op: 'is', values: ['1'] }]] }] }]);
    expect(signoffTypeOptions('fit', { ...JOBS[0], nInd: '3' })).toEqual([{ value: '5x', label: '5X', default: true }]);
    expect(signoffTypeOptions('fit', { ...JOBS[0], nInd: '2' })?.map(o => o.value)).toEqual(['vt', '5x']);
  });

  it('does not bypass replacement enable conditions or resurrect a deleted replacement', () => {
    setSignoffTypeRows([{ stepId: 'fit', types: [{ type: 'vt', default: true },
      { type: '5x', enableWhen: [[{ field: 'nInd', op: 'is', values: ['1'] }]] }],
      typeExceptions: [{ from: 'vt', to: '5x' }] }]);
    expect(signoffTypeOptions('fit', { ...JOBS[0], nInd: '3' })).toEqual([]);
    setRoutingSignoffTypes(getRoutingSignoffTypes().filter(t => t.value !== '5x'));
    expect(signoffTypeOptions('fit', { ...JOBS[0], nInd: '1' })).toEqual([]);
  });

  it('uses first matching AND/OR conditions for numbered Repair rows', () => {
    setSignoffTypeRows([{ stepId: 'repair', types: [{ type: 'repair' }], typeExceptions: [
      { from: 'repair', to: 'vt', when: [[{ field: 'nInd', op: 'is', values: ['3'] }, { field: 'hull', op: 'contains', values: ['test'] }],
        [{ field: 'nInd', op: 'is', values: ['1'] }]] }, { from: 'repair', to: '5x' }] }]);
    expect(signoffTypeOptions('repair-2', { ...JOBS[0], nInd: '3', hull: 'TEST' })?.[0].value).toBe('vt');
    expect(signoffTypeOptions('repair-2', { ...JOBS[0], nInd: '2' })?.[0].value).toBe('5x');
  });
  afterEach(() => { localStorage.removeItem(STORAGE.signoffTypes); localStorage.removeItem(STORAGE.routingSignoffTypes); });

  it('uses editable conditions for VT versus 5X on regular and NQC routings', () => {
    const job = { ...JOBS[0], ndtFinal: 'VT' };
    for (const id of ['final-ndt-vt5x', 'nqc-final-ndt-vt5x']) {
      expect(signoffTypeOptions(id, job)?.map(o => o.value)).toEqual(['vt']);
      expect(signoffTypeOptions(id, { ...job, ndtFinal: '5X' })?.map(o => o.value)).toEqual(['5x']);
    }
    setSignoffTypeRows(getSignoffTypeRows().map(r => r.stepId === 'final-ndt-vt5x'
      ? { ...r, types: r.types.map(t => ({ ...t, enableWhen: [] })) } : r));
    expect(buildStages({ ...job, nInd: '3' }).find(s => s.id === 'final-ndt-vt5x')?.typeOptions?.map(o => o.value)).toEqual(['vt', '5x']);
  });

  it('does not select a disabled default, and no enabled Types still requires a pick', () => {
    setSignoffTypeRows([{ stepId: 'fit', types: [{ type: 'fit', default: true,
      enableWhen: [[{ field: 'nInd', op: 'is', values: ['1'] }]] }] }]);
    const stage = buildStages({ ...JOBS[0], nInd: '3' }).find(s => s.id === 'fit')!;
    expect(stage.typeOptions).toEqual([]);
    expect(stage.inspectionType).toBe('');
    expect(inspectionTypeRequired(stage)).toBeTrue();
  });

  it('seeds the built-in steps plus Repair and Excavation NDT', () => {
    const ids = getSignoffTypeRows().map(r => r.stepId);
    expect(ids).toContain('fit');
    expect(ids).toContain('final-ndt-utrt');
    expect(ids).toContain('repair');
    expect(ids).toContain('excavation-ndt');
  });

  it('a step with no row has no Type', () => {
    expect(signoffTypeOptions('engineering-hold')).toBeUndefined();
    setSignoffTypeRows(getSignoffTypeRows().filter(r => r.stepId !== 'tack'));
    expect(signoffTypeOptions('tack')).toBeUndefined();
  });

  it('every Repair round uses the Repair row', () => {
    expect(nextRepairStage([{ id: 'repair' }]).typeOptions?.map(o => o.value)).toEqual(['repair']);
  });

  it('Excavation NDT offers the rejecting method only while it has a row', () => {
    expect(excavationNdtStage('rt').typeOptions?.map(o => o.value)).toEqual(['rt']);
    setSignoffTypeRows(getSignoffTypeRows().filter(r => r.stepId !== 'excavation-ndt'));
    expect(excavationNdtStage('rt').typeOptions).toBeUndefined();
  });

  it('no default starts blank and is required; a default pre-fills', () => {
    const noDefault = { id: 'tack', typeOptions: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] };
    expect(inspectionTypeRequired(noDefault)).toBeTrue();
    expect(initialInspectionType(noDefault)).toBe('');
    const withDefault = { id: 'root-ndt-utrt', typeOptions: [{ label: 'RT', value: 'rt', default: true }] };
    expect(inspectionTypeRequired(withDefault)).toBeFalse();
    expect(initialInspectionType(withDefault)).toBe('rt');
  });

  it('a step without a Type of its own before gets one named after it', () => {
    expect(signoffTypeOptions('fitup-insp')).toEqual([{ label: 'Fit-Up Insp', value: 'fitup-insp', default: true }]);
    expect(signoffTypeOptions('nqc-fitup-insp')?.map(o => o.value)).toEqual(['fitup-insp']);
  });

  it('options carry their Signoff Types name and settings; a deleted Type drops out', () => {
    expect(signoffTypeOptions('root-layer')).toEqual([
      { label: 'Interim Layer', value: 'interim', default: true },
      { label: 'Final Weld', value: 'final-weld', signsStep: 'final-weld' },
    ]);
    setRoutingSignoffTypes(getRoutingSignoffTypes().map(t => t.value === 'interim' ? { ...t, label: 'Layer Pass' } : t).filter(t => t.value !== 'final-weld'));
    expect(signoffTypeOptions('root-layer')?.map(o => o.label)).toEqual(['Layer Pass']);
  });

  it('an added Type gets a value from its name', () => {
    setRoutingSignoffTypes([{ label: 'Weld Build-Up', value: '' }]);
    expect(getRoutingSignoffTypes()[0].value).toBe('weld-build-up');
  });
});
