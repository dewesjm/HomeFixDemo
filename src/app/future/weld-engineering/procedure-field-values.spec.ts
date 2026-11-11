import {
  withAllFields, compactExtras, extraFieldProblems, extraValueText, sectionValue, textValue, listValue, isBlank
} from './procedure-field-values';
import type { ExtraField, ProcedureSection } from './procedure-sections';

const field = (key: string, type: ExtraField['type'], extra: Partial<ExtraField> = {}): ExtraField =>
  ({ key, label: key, type, required: false, options: [], ...extra });

const taco: ProcedureSection = {
  id: 's1', name: 'Taco Tuesday', fields: [
    field('shell_type', 'list', { label: 'Shell Type', required: true, options: ['Hard', 'Soft'] }),
    field('spice_level', 'number', { label: 'Spice Level' }),
    field('taco_count', 'range', { label: 'Taco Count', required: true }),
  ],
};
const welding: ProcedureSection = {
  id: 's2', name: 'Welding', fields: [
    field('fillers', 'multi', { source: 'fillerMetalTypes' }),
    field('phMin', 'limit', { label: 'PH Min' }),
    field('override', 'override'),
    field('quals', 'quals'),
  ],
};

describe('procedure field values', () => {
  it('fills an empty value of the right shape for every defined field and keeps existing values', () => {
    expect(withAllFields([taco, welding], { shell_type: 'Soft', old_key: 'x' })).toEqual({
      shell_type: 'Soft', old_key: 'x', spice_level: null, taco_count: { min: null, max: null },
      fillers: [], phMin: '', override: { phMin: '', phMax: '', ipMin: '', ipMax: '', note: '' },
      quals: { op: 'all', items: [] },
    });
  });

  it('stores only filled-in values, NC in capitals and qual groups pruned', () => {
    const all = withAllFields([taco, welding], {});
    expect(compactExtras({ ...all, shell_type: ' Hard ' })).toEqual({ shell_type: 'Hard' });
    expect(compactExtras({ spice_level: 0, taco_count: { min: 1, max: null }, phMin: 'nc' }))
      .toEqual({ spice_level: 0, taco_count: { min: 1, max: null }, phMin: 'NC' });
    expect(compactExtras({ quals: { op: 'all', items: [{ op: 'any', items: [] }] } })).toEqual({});
    expect(compactExtras({ override: { phMin: '', phMax: '', ipMin: '', ipMax: '', note: ' Thin wall ' } }))
      .toEqual({ override: { phMin: '', phMax: '', ipMin: '', ipMax: '', note: 'Thin wall' } });
  });

  it('treats empty lists, groups and override groups as blank', () => {
    expect(isBlank([])).toBeTrue();
    expect(isBlank({ op: 'any', items: [] })).toBeTrue();
    expect(isBlank({ phMin: '', phMax: '', ipMin: '', ipMax: '', note: '' })).toBeTrue();
    expect(isBlank(['x'])).toBeFalse();
  });

  it('reports required fields left blank, a range with Min over Max and a limit that is not a number or NC', () => {
    expect(extraFieldProblems([taco], withAllFields([taco], {}))).toEqual([
      'Shell Type is required.', 'Taco Count needs both Min and Max.',
    ]);
    expect(extraFieldProblems([taco], { shell_type: 'Hard', taco_count: { min: 5, max: 2 } }))
      .toEqual(['Taco Count: Min is more than Max.']);
    expect(extraFieldProblems([taco], { shell_type: 'Hard', taco_count: { min: 2, max: 5 } })).toEqual([]);
    expect(extraFieldProblems([welding], { phMin: 'hot' })).toEqual(['PH Min must be a number or NC.']);
    expect(extraFieldProblems([welding], { phMin: 'NC' })).toEqual([]);
  });

  it('formats values as one line of text', () => {
    expect(extraValueText(undefined, { min: 2, max: 4 })).toBe('2 - 4');
    expect(extraValueText(undefined, { min: null, max: null })).toBe('');
    expect(extraValueText(undefined, 7)).toBe('7');
    expect(extraValueText(undefined, undefined)).toBe('');
    expect(extraValueText(welding.fields[0], ['mil-70s-3', 'mil-80s-50'])).toBe('MIL-70S-3, MIL-80S-50');
    expect(extraValueText(undefined, { op: 'all', items: ['WELD412', { op: 'any', items: ['WELD427', 'WELD403'] }] }))
      .toBe('WELD412 AND (WELD427 OR WELD403)');
    expect(extraValueText(undefined, { phMin: '50', phMax: '', ipMin: '', ipMax: '', note: 'Thin' })).toBe('PH Min 50, Note Thin');
  });

  it('reads a value only when its section is ticked on the procedure', () => {
    const p = { sectionIds: ['s2'], extraFields: { shell_type: 'Hard', fillers: ['mil-70s-3'], phMin: '50' } };
    expect(sectionValue(p, 'shell_type', [taco, welding])).toBeUndefined();
    expect(textValue(p, 'shell_type', [taco, welding])).toBe('');
    expect(textValue(p, 'phMin', [taco, welding])).toBe('50');
    expect(listValue(p, 'fillers', [taco, welding])).toEqual(['mil-70s-3']);
    expect(textValue(p, 'no_such_field', [taco, welding])).toBe('');
  });
});
