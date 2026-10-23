import { STORAGE } from '../../data/storage-keys';
import { excavationNdtStage, nextRepairStage } from '../routing/added-steps';
import { getSignoffTypeRows, setSignoffTypeRows, signoffTypeOptions } from './signoff-types';
import { initialInspectionType, inspectionTypeRequired } from './stage-rules';
import { getRoutingSignoffTypes, setRoutingSignoffTypes } from './routing-signoff-types';

describe('Signoff Types By Routing', () => {
  afterEach(() => { localStorage.removeItem(STORAGE.signoffTypes); localStorage.removeItem(STORAGE.routingSignoffTypes); });

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
