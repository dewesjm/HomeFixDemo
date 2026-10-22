import { DECISION_KEY, HEADING_KEY_PREFIX, definitionFields, layoutItems, withDefaultLayout, withDefaultWidths } from './step-field-config';

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

describe('Inspection Results in the Layout list', () => {
  it('is not one of the definition fields', () => {
    expect(definitionFields([{ key: 'a' }, { key: DECISION_KEY }])).toEqual([{ key: 'a' }]);
  });

  it('goes after the fields when the definition does not place it', () => {
    expect(layoutItems([{ key: 'a' }])).toEqual([{ key: 'a' }, { key: DECISION_KEY }]);
    const placed = [{ key: DECISION_KEY }, { key: 'a' }];
    expect(layoutItems(placed)).toBe(placed);
  });
});
