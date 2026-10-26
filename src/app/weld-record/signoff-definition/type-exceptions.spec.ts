import { JOBS } from '../../data/jobs';
import { STORAGE } from '../../data/storage-keys';
import { normalizeMaterialClassification } from '../../data/material-classification';
import { getSignoffTypeRows, excavationTypeOptions } from './signoff-types';
import { normalizeTypeException, replacedType, TypeException, typeExceptionCondition } from './type-exceptions';

describe('Separate material exception conditions', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  const job = (first: string, second = '02-CS', nInd = '3') => ({ ...JOBS[0], materialType1: first, materialType2: second, nInd });
  it('seeds explicit non-ferrous OR austenitic conditions for both Excavations', () => {
    for (const id of ['excavation-ndt', 'nqc-excavation-ndt']) {
      const rule = getSignoffTypeRows().find(r => r.stepId === id)!.typeExceptions![0];
      expect(rule.when!.map(g => g[0].field)).toEqual(['material.nonFerrous', 'material.austenitic']);
      for (const material of ['12-SS304', '63-AL10', '60-TICP']) {
        expect(excavationTypeOptions(job('02-CS', material), 'pt', id)?.[0].value).toBe('5x');
      }
      expect(excavationTypeOptions(job('02-CS'), 'pt', id)?.[0].value).toBe('pt');
      expect(typeExceptionCondition(rule)).toContain(' OR ');
    }
  });
  it('supports AND, OR and negative material clauses across both members', () => {
    const rule: TypeException = { from: 'pt', to: '5x', when: [[
      { field: 'material.titanium', op: 'is', values: ['Yes'] },
      { field: 'material.austenitic', op: 'is', values: ['Yes'] },
    ]] };
    expect(replacedType([rule], 'pt', job('60-TICP', '12-SS304'))).toBe('5x');
    expect(replacedType([rule], 'pt', job('60-TICP'))).toBe('pt');
    rule.when!.push([{ field: 'material.nonFerrous', op: 'isNot', values: ['Yes'] }]);
    expect(replacedType([rule], 'pt', job('02-CS'))).toBe('5x');
  });
  it('migrates combined guards without losing AND restrictions or priority', () => {
    const legacy: TypeException = { from: 'pt', to: '5x', materialFlag: 'nonFerrousOrAustenitic',
      when: [[{ field: 'nInd', op: 'is', values: ['1'] }], [{ field: 'nInd', op: 'is', values: ['2'] }]] };
    const migrated = normalizeTypeException(legacy);
    expect(migrated.when!.length).toBe(4);
    expect(migrated.materialFlag).toBeUndefined();
    expect(replacedType([legacy], 'pt', job('12-SS304', '02-CS', '1'))).toBe('5x');
    expect(replacedType([legacy], 'pt', job('63-AL10', '02-CS', '2'))).toBe('5x');
    expect(replacedType([legacy], 'pt', job('63-AL10'))).toBe('pt');
    localStorage.setItem(STORAGE.signoffTypes, JSON.stringify([{ stepId: 'fit', types: [], typeExceptions: [legacy, { from: 'pt', to: 'mt' }] }]));
    expect(getSignoffTypeRows()[0].typeExceptions!.map(r => r.to)).toEqual(['5x', 'mt']);
    expect(getSignoffTypeRows()[0].typeExceptions![0]).toEqual(migrated);
  });
  it('splits saved material flags and retains explicit saved classifications', () => {
    expect(normalizeMaterialClassification({ code: '12-SS304', titanium: false, nonFerrousOrAustenitic: true }))
      .toEqual({ code: '12-SS304', titanium: false, nonFerrous: false, austenitic: true });
    expect(normalizeMaterialClassification({ code: '63-AL10', titanium: false, nonFerrousOrAustenitic: false }).nonFerrous).toBeFalse();
    expect(normalizeMaterialClassification({ code: 'CUSTOM', titanium: false, nonFerrousOrAustenitic: true }).nonFerrous).toBeTrue();
    expect(normalizeMaterialClassification({ code: '12-SS304', titanium: false, nonFerrous: true, austenitic: false }).austenitic).toBeFalse();
  });
});
