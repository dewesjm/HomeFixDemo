import { STORAGE } from '../storage-keys';
import { excavationNdtStage, nextRepairStage } from './added-steps';
import { getSignoffTypeRows, setSignoffTypeRows, signoffTypeOptions } from './signoff-types';
import { initialInspectionType, inspectionTypeRequired } from './stage-rules';

describe('Signoff Type Availability', () => {
  afterEach(() => localStorage.removeItem(STORAGE.signoffTypes));

  it('seeds the built-in steps plus Repair and Excavation NDT', () => {
    const ids = getSignoffTypeRows().map(r => r.stepId);
    expect(ids).toContain('fit');
    expect(ids).toContain('final-ndt-utrt');
    expect(ids).toContain('repair');
    expect(ids).toContain('excavation-ndt');
  });

  it('a step with no row has no Type', () => {
    expect(signoffTypeOptions('fitup-insp')).toBeUndefined();
    setSignoffTypeRows(getSignoffTypeRows().filter(r => r.stepId !== 'tack'));
    expect(signoffTypeOptions('tack')).toBeUndefined();
  });

  it('every Repair round uses the Repair row', () => {
    expect(nextRepairStage([{ id: 'repair' }]).routingOptions?.map(o => o.value)).toEqual(['repair']);
  });

  it('Excavation NDT offers the rejecting method only while it has a row', () => {
    expect(excavationNdtStage('rt').routingOptions?.map(o => o.value)).toEqual(['rt']);
    setSignoffTypeRows(getSignoffTypeRows().filter(r => r.stepId !== 'excavation-ndt'));
    expect(excavationNdtStage('rt').routingOptions).toBeUndefined();
  });

  it('no default starts blank and is required; a default pre-fills', () => {
    const noDefault = { id: 'tack', routingOptions: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] };
    expect(inspectionTypeRequired(noDefault)).toBeTrue();
    expect(initialInspectionType(noDefault)).toBe('');
    const withDefault = { id: 'root-ndt-utrt', routingOptions: [{ label: 'RT', value: 'rt', default: true }] };
    expect(inspectionTypeRequired(withDefault)).toBeFalse();
    expect(initialInspectionType(withDefault)).toBe('rt');
  });

  it('an added option gets a value from its name', () => {
    setSignoffTypeRows([{ stepId: 'tack', options: [{ label: 'Weld Build-Up', value: '' }] }]);
    expect(signoffTypeOptions('tack')?.[0].value).toBe('weld-build-up');
  });
});
