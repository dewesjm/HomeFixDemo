import { COMMENTS_KEY, DECISION_KEY, DEFAULT_STEP_FIELD_ACTIVATIONS, HEADING_KEY_PREFIX, TYPE_KEY, definitionFields, withDefaultLayout, withDefaultWidths, withSplitFill, withAffectedItemMics, withSignoffSectionFields } from './step-field-config';

describe('withDefaultLayout (definitions saved before the layout settings)', () => {
  it('puts the default fields in default order with their lines, widths and headings, other fields after them', () => {
    const out = withDefaultLayout({ stepId: 'fit-weld-buildup', fields: [
      { key: 'weldProcedure' }, { key: 'wtn' }, { key: 'rtFileNumber' }, { key: 'affectedItem', required: true },
    ] });
    expect(out.fields).toEqual([
      { key: 'affectedItem', required: true },
      { key: HEADING_KEY_PREFIX + 'weld', heading: '', newBox: true },
      { key: 'weldProcedure', width: 320 }, { key: 'wtn', sameLine: true, width: 320 },
      { key: 'rtFileNumber' },
    ]);
  });

  it('leaves a step with no default definition as saved', () => {
    const a = { stepId: 'added-step', fields: [{ key: 'b' }, { key: 'a' }] };
    expect(withDefaultLayout(a)).toBe(a);
  });
});

describe('withDefaultWidths (definitions saved before widths and Inspection Results)', () => {
  it('gives fields the default width and puts Inspection Results before Defect Code', () => {
    const out = withDefaultWidths({ stepId: 'root-ndt-utrt', fields: [
      { key: 'defectCode' }, { key: 'procedureUsed' }, { key: 'rtFileNumber', sameLine: true },
    ] });
    expect(out.fields).toEqual([
      { key: DECISION_KEY }, { key: 'defectCode', width: 320 }, { key: 'procedureUsed' }, { key: 'rtFileNumber', sameLine: true },
    ]);
  });

  it('puts Inspection Results after the fields when there is no Defect Code, and only where the default has it', () => {
    expect(withDefaultWidths({ stepId: 'root-ndt-mtpt', fields: [{ key: 'procedureUsed' }] }).fields)
      .toEqual([{ key: 'procedureUsed' }, { key: DECISION_KEY }]);
    expect(withDefaultWidths({ stepId: 'tack', fields: [{ key: 'weldPosition' }] }).fields)
      .toEqual([{ key: 'weldPosition', width: 200 }]);
  });
});

describe('withSplitFill (definitions saved before Prepopulated from and Disabled when were separate)', () => {
  const off = { source: 'stageProperty' as const, key: 'engineeringEntry', equals: '' };
  const insertOnly = { source: 'field' as const, key: 'consumableInsertOnly', equals: 'yes' };

  it('adds "Engineering override is off" to a saved WTN fill and disables the field under the same condition', () => {
    const fill = { from: 'wtn' as const, fieldKey: 'phMax', when: { all: [] } };
    expect(withSplitFill({ stepId: 'tack', fields: [{ key: 'wtn', fill }, { key: 'phMin', fill }] }).fields).toEqual([
      { key: 'wtn', fill: { ...fill, when: { all: [off] } }, disabledIf: { all: [off] } },
      /* the same Disabled when as the catalog's, so nothing is stored */
      { key: 'phMin', fill: { ...fill, when: { all: [off] } } },
    ]);
  });

  it('a saved fill from another step disables the field while it holds; catalog fills are left to the catalog', () => {
    const fill = { stepId: 'pre-fit', fieldKey: 'consumableInsertType', when: { all: [insertOnly] } };
    expect(withSplitFill({ stepId: 'tack', fields: [{ key: 'wtn', fill }, { key: 'weldProcess' }] }).fields)
      .toEqual([{ key: 'wtn', fill, disabledIf: { all: [insertOnly] } }, { key: 'weldProcess' }]);
  });

  it('a field never prepopulated is never disabled, and its own Disabled when is kept', () => {
    const own = { all: [{ source: 'field' as const, key: 'wtn', equals: 'x' }] };
    expect(withSplitFill({ stepId: 'tack', fields: [{ key: 'weldProcess', fill: null }, { key: 'phMin', disabledIf: own }] }).fields)
      .toEqual([{ key: 'weldProcess', fill: null, disabledIf: { all: [] } }, { key: 'phMin', disabledIf: own }]);
  });
});

describe('signoff section fields (Type, Inspection Results, Comments)', () => {
  it('Inspection Results is one of the definition fields', () => {
    expect(definitionFields([{ key: 'a' }, { key: DECISION_KEY }])).toEqual([{ key: 'a' }, { key: DECISION_KEY }]);
  });

  it('are seeded where they showed: Inspection Results only on steps with a reject target, Comments on every step but Sold', () => {
    const keys = (id: string) => DEFAULT_STEP_FIELD_ACTIVATIONS.find(a => a.stepId === id)!.fields.map(f => f.key);
    expect(keys('root-ndt-utrt')).toContain(DECISION_KEY);
    expect(keys('fitup-insp')).toContain(DECISION_KEY);
    expect(keys('review-o63')).toContain(DECISION_KEY);
    expect(keys('root-weld')).not.toContain(DECISION_KEY);
    expect(keys('root-weld')[0]).toBe(TYPE_KEY);
    expect(keys('pre-fit')).not.toContain(TYPE_KEY);
    expect(keys('fit-weld-buildup')).not.toContain(TYPE_KEY);
    expect(keys('fitup-release')).toEqual([COMMENTS_KEY]);
    expect(keys('sold')).toEqual([]);
  });
});

describe('withSignoffSectionFields (definitions saved before Type, Inspection Results and Comments were fields)', () => {
  it('drops Inspection Results from a step with no reject target and adds Type and Comments', () => {
    expect(withSignoffSectionFields({ stepId: 'root-weld', fields: [{ key: 'wtn' }, { key: DECISION_KEY }] }).fields.map(f => f.key))
      .toEqual([TYPE_KEY, 'wtn', COMMENTS_KEY]);
  });

  it('adds Inspection Results where the step has a reject target, and leaves listed fields where they are', () => {
    expect(withSignoffSectionFields({ stepId: 'review-o63', fields: [{ key: 'verifyDrawing' }, { key: COMMENTS_KEY }] }).fields.map(f => f.key))
      .toEqual(['verifyDrawing', COMMENTS_KEY, DECISION_KEY]);
  });

  it('gives Sold nothing and Weld Build-Up no Type', () => {
    expect(withSignoffSectionFields({ stepId: 'sold', fields: [] }).fields).toEqual([]);
    expect(withSignoffSectionFields({ stepId: 'fit-weld-buildup', fields: [] }).fields.map(f => f.key)).toEqual([COMMENTS_KEY]);
  });
});

describe('withAffectedItemMics (definitions saved before the MIC verified rows were fields)', () => {
  it('adds both rows after Affected Item, and leaves definitions without it alone', () => {
    expect(withAffectedItemMics({ stepId: 'fit-weld-buildup', fields: [{ key: 'affectedItem' }, { key: 'wtn' }] }).fields.map(f => f.key))
      .toEqual(['affectedItem', 'affectedMicVerified1', 'affectedMicVerified2', 'wtn']);
    expect(withAffectedItemMics({ stepId: 'tack', fields: [{ key: 'wtn' }] }).fields.map(f => f.key)).toEqual(['wtn']);
  });
});
