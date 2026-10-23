import {
  fieldKey, sectionNameProblem, fieldDraftProblem, withAllFields, compactExtras, extraFieldProblems,
  extraValueText, sectionNumber, type ProcedureSection
} from './procedure-sections';

const taco: ProcedureSection = {
  id: 's1', name: 'Taco Tuesday', fields: [
    { key: 'shell_type', label: 'Shell Type', type: 'list', required: true, options: ['Hard', 'Soft'] },
    { key: 'spice_level', label: 'Spice Level', type: 'number', required: false, options: [] },
    { key: 'taco_count', label: 'Taco Count', type: 'range', required: true, options: [] },
  ],
};

describe('procedure sections', () => {
  it('numbers added sections after the 11 built-in ones', () => {
    expect(sectionNumber(0)).toBe(12);
    expect(sectionNumber(2)).toBe(14);
  });

  it('makes a field key from the label, unique across taken keys', () => {
    expect(fieldKey('Spice Level', [])).toBe('spice_level');
    expect(fieldKey('Spice Level!', ['spice_level'])).toBe('spice_level_2');
    expect(fieldKey('Spice Level', ['spice_level', 'spice_level_2'])).toBe('spice_level_3');
  });

  it('rejects a blank or duplicate section name, including built-in names', () => {
    expect(sectionNameProblem('  ', [])).not.toBe('');
    expect(sectionNameProblem('heat treatment', [])).not.toBe('');
    expect(sectionNameProblem('taco tuesday', [taco])).not.toBe('');
    expect(sectionNameProblem('Lunch', [taco])).toBe('');
  });

  it('rejects a field with no label, a duplicate label, or a list with no choices', () => {
    const ok = { label: 'Salsa', type: 'text' as const, required: false, options: [] };
    expect(fieldDraftProblem(ok, taco)).toBe('');
    expect(fieldDraftProblem({ ...ok, label: '' }, taco)).not.toBe('');
    expect(fieldDraftProblem({ ...ok, label: 'shell type' }, taco)).not.toBe('');
    expect(fieldDraftProblem({ ...ok, type: 'list' }, taco)).not.toBe('');
  });

  it('fills an empty value for every defined field and keeps existing values', () => {
    expect(withAllFields([taco], { shell_type: 'Soft', old_key: 'x' })).toEqual({
      shell_type: 'Soft', old_key: 'x', spice_level: null, taco_count: { min: null, max: null },
    });
  });

  it('stores only filled-in values', () => {
    expect(compactExtras({ shell_type: ' Hard ', spice_level: null, taco_count: { min: null, max: null }, note: '' }))
      .toEqual({ shell_type: 'Hard' });
    expect(compactExtras({ spice_level: 0, taco_count: { min: 1, max: null } }))
      .toEqual({ spice_level: 0, taco_count: { min: 1, max: null } });
  });

  it('reports required fields left blank and a range with Min over Max', () => {
    expect(extraFieldProblems([taco], withAllFields([taco], {}))).toEqual([
      'Shell Type is required.', 'Taco Count needs both Min and Max.',
    ]);
    expect(extraFieldProblems([taco], { shell_type: 'Hard', taco_count: { min: 5, max: 2 } }))
      .toEqual(['Taco Count: Min is more than Max.']);
    expect(extraFieldProblems([taco], { shell_type: 'Hard', taco_count: { min: 2, max: 5 } })).toEqual([]);
  });

  it('formats values as one line of text', () => {
    expect(extraValueText({ min: 2, max: 4 })).toBe('2 - 4');
    expect(extraValueText({ min: null, max: null })).toBe('');
    expect(extraValueText(7)).toBe('7');
    expect(extraValueText(undefined)).toBe('');
  });
});
