import {
  fieldKey, sectionNameProblem, fieldDraftProblem, fieldLabelProblem, sectionsOnProcedure, procedureSections, SEEDED_SECTION_IDS,
  withSectionShifted, withFieldShifted, withFieldMoved, withSectionRenamed, withFieldRenamed, withFieldRemoved, withSectionRemoved,
  type ProcedureSection
} from './procedure-sections';

const taco: ProcedureSection = {
  id: 's1', name: 'Taco Tuesday', fields: [
    { key: 'shell_type', label: 'Shell Type', type: 'list', required: true, options: ['Hard', 'Soft'] },
  ],
};

describe('procedure sections', () => {
  it('seeds the 11 starting sections in order, with the fields other systems read locked', () => {
    const seeded = procedureSections().filter(s => SEEDED_SECTION_IDS.includes(s.id));
    expect(seeded.map(s => s.name)).toEqual([
      'Base Metal', 'Joint Design', 'Welding Position', 'Filler Metal', 'Welder Qualifications',
      'Preheat & Interpass Temperatures', 'Equipment', 'Gas', 'Heat Input', 'Parameters', 'Heat Treatment',
    ]);
    const locked = seeded.flatMap(s => s.fields).filter(f => f.locked).map(f => f.key);
    expect(locked).toEqual([
      'baseMetal1Type', 'baseMetal2Type', 'weldPosition', 'fillerMetalTypes', 'fillerMetalClassification',
      'fillerMetalSizes', 'requiredQuals', 'phMin', 'phMax', 'ipMin', 'ipMax', 'override',
    ]);
  });

  it('numbers sections by list order, and keeps each number when a procedure skips earlier ones', () => {
    const two: ProcedureSection = { id: 's2', name: 'Second', fields: [] };
    expect(sectionsOnProcedure(['s1', 's2'], [taco, two]).map(s => s.number)).toEqual([1, 2]);
    expect(sectionsOnProcedure(['s2'], [taco, two]).map(s => [s.section.id, s.number])).toEqual([['s2', 2]]);
    expect(sectionsOnProcedure([], [taco, two])).toEqual([]);
  });

  it('makes a field key from the label, unique across taken keys', () => {
    expect(fieldKey('Spice Level', [])).toBe('spice_level');
    expect(fieldKey('Spice Level!', ['spice_level'])).toBe('spice_level_2');
    expect(fieldKey('Spice Level', ['spice_level', 'spice_level_2'])).toBe('spice_level_3');
  });

  it('rejects a blank or duplicate section name', () => {
    expect(sectionNameProblem('  ', [])).not.toBe('');
    expect(sectionNameProblem('taco tuesday', [taco])).not.toBe('');
    expect(sectionNameProblem('Lunch', [taco])).toBe('');
  });

  it('rejects a field with no label, a duplicate label, a list with no choices or a table with no source', () => {
    const ok = { label: 'Salsa', type: 'text' as const, required: false, options: [] };
    expect(fieldDraftProblem(ok, taco)).toBe('');
    expect(fieldDraftProblem({ ...ok, label: '' }, taco)).not.toBe('');
    expect(fieldDraftProblem({ ...ok, label: 'shell type' }, taco)).not.toBe('');
    expect(fieldDraftProblem({ ...ok, type: 'list' }, taco)).not.toBe('');
    expect(fieldDraftProblem({ ...ok, type: 'multi' }, taco)).not.toBe('');
    expect(fieldDraftProblem({ ...ok, type: 'table' }, taco)).not.toBe('');
    expect(fieldDraftProblem({ ...ok, type: 'table', source: 'weldPositions' }, taco)).toBe('');
  });

  it('only lets a new field be one of the addable types', () => {
    const draft = { label: 'Salsa', required: false, options: [] };
    expect(fieldDraftProblem({ ...draft, type: 'quals' }, taco)).not.toBe('');
    expect(fieldDraftProblem({ ...draft, type: 'override' }, taco)).not.toBe('');
    expect(fieldDraftProblem({ ...draft, type: 'limit' }, taco)).toBe('');
  });

  describe('editing', () => {
    const lunch: ProcedureSection = {
      id: 's2', name: 'Lunch', fields: [
        { key: 'drink', label: 'Drink', type: 'text', required: false, options: [] },
        { key: 'ph', label: 'PH', type: 'limit', required: false, options: [], locked: true },
      ],
    };
    const list = [taco, lunch];

    it('lets a rename keep its own name or label but not take another one', () => {
      expect(sectionNameProblem('Taco Tuesday', list, 's1')).toBe('');
      expect(sectionNameProblem('lunch', list, 's1')).not.toBe('');
      expect(fieldLabelProblem('drink', lunch, 'drink')).toBe('');
      expect(fieldLabelProblem('ph', lunch, 'drink')).not.toBe('');
    });

    it('renames sections and fields (locked too) without changing keys', () => {
      expect(withSectionRenamed(list, 's2', ' Dinner ')[1].name).toBe('Dinner');
      const renamed = withFieldRenamed(list, 'ph', 'Preheat');
      expect(renamed[1].fields[1]).toEqual({ ...lunch.fields[1], label: 'Preheat' });
    });

    it('reorders sections and fields, ignoring moves past either end', () => {
      expect(withSectionShifted(list, 's2', -1).map(s => s.id)).toEqual(['s2', 's1']);
      expect(withSectionShifted(list, 's1', -1)).toBe(list);
      expect(withFieldShifted(list, 'ph', -1)[1].fields.map(f => f.key)).toEqual(['ph', 'drink']);
      expect(withFieldShifted(list, 'ph', 1)[1].fields.map(f => f.key)).toEqual(['drink', 'ph']);
    });

    it('moves a field to the end of another section', () => {
      const moved = withFieldMoved(list, 'ph', 's1');
      expect(moved[0].fields.map(f => f.key)).toEqual(['shell_type', 'ph']);
      expect(moved[1].fields.map(f => f.key)).toEqual(['drink']);
    });

    it('never removes a locked field or a section holding one', () => {
      expect(withFieldRemoved(list, 'drink')[1].fields.map(f => f.key)).toEqual(['ph']);
      expect(withFieldRemoved(list, 'ph')).toEqual(list);
      expect(withSectionRemoved(list, 's2')).toEqual(list);
      expect(withSectionRemoved(list, 's1').map(s => s.id)).toEqual(['s2']);
    });
  });
});
