import { ConditionCatalogField } from '../../routing/condition-catalog';
import { conditionFieldGroups, conditionValueOptions, clauseTyped, clauseValid, patchClause, newConditionClause } from './condition-editing';

const FIELDS: ConditionCatalogField[] = [
  { key: 'self.result', label: 'Result', group: 'This routing', values: ['sat', 'unsat'], valueLabel: (v: string) => v.toUpperCase() },
  { key: 'nInd', label: 'Nuclear Indicator', group: 'Joint Details', values: ['1', '2', '3'] },
  { key: 'drawing', label: 'Drawing', group: 'Joint Details', values: [] },
  { key: 'tack.wtn', label: 'Tack WTN', group: 'Routing answers', values: [], stepAnswer: true },
] as unknown as ConditionCatalogField[];

describe('condition-editing', () => {
  it('groups fields into This routing, Joint Details and Earlier routings, dropping empty groups', () => {
    expect(conditionFieldGroups(FIELDS).map(g => [g.label, g.fields.map(f => f.key)])).toEqual([
      ['This routing', ['self.result']],
      ['Joint Details', ['nInd', 'drawing']],
      ['Earlier routings (once signed)', ['tack.wtn']],
    ]);
    expect(conditionFieldGroups([FIELDS[1]]).map(g => g.label)).toEqual(['Joint Details']);
  });

  it('lists a field\'s values with their labels', () => {
    expect(conditionValueOptions(FIELDS, 'self.result')).toEqual([{ value: 'sat', label: 'SAT' }, { value: 'unsat', label: 'UNSAT' }]);
    expect(conditionValueOptions(FIELDS, 'drawing')).toEqual([]);
  });

  it('contains, or a field with no values, is typed; complete when it has a value', () => {
    expect(clauseTyped(FIELDS, { field: 'nInd', op: 'is', values: [] })).toBeFalse();
    expect(clauseTyped(FIELDS, { field: 'nInd', op: 'contains', values: [] })).toBeTrue();
    expect(clauseTyped(FIELDS, { field: 'drawing', op: 'is', values: [] })).toBeTrue();
    expect(clauseValid(FIELDS, { field: 'nInd', op: 'is', values: ['1'] })).toBeTrue();
    expect(clauseValid(FIELDS, { field: 'drawing', op: 'is', values: ['  '] })).toBeFalse();
  });

  it('a new field, or a switch between picked and typed, clears the values', () => {
    const c = { field: 'nInd', op: 'is' as const, values: ['1'] };
    expect(patchClause(FIELDS, c, { field: 'drawing' }).values).toEqual([]);
    expect(patchClause(FIELDS, c, { op: 'contains' }).values).toEqual([]);
    expect(patchClause(FIELDS, c, { op: 'isNot' }).values).toEqual(['1']);
    expect(patchClause(FIELDS, c, { values: ['1', '2'] }).values).toEqual(['1', '2']);
  });

  it('a new clause starts on the first condition field with no values', () => {
    expect(newConditionClause().values).toEqual([]);
    expect(newConditionClause().op).toBe('is');
  });
});
