import { HEADING_KEY_PREFIX, withDefaultLayout } from './step-field-config';

describe('withDefaultLayout (definitions saved before the layout settings)', () => {
  it('puts the default fields in default order with their lines and headings, other fields after them', () => {
    const out = withDefaultLayout({ stepId: 'fit-weld-buildup', fields: [
      { key: 'weldProcedure' }, { key: 'wtn' }, { key: 'rtFileNumber' }, { key: 'affectedItem', required: true },
    ] });
    expect(out.fields).toEqual([
      { key: 'affectedItem', required: true },
      { key: HEADING_KEY_PREFIX + 'weld', heading: '', newBox: true },
      { key: 'weldProcedure' }, { key: 'wtn', sameLine: true },
      { key: 'rtFileNumber' },
    ]);
  });

  it('leaves a step with no default definition as saved', () => {
    const a = { stepId: 'added-step', fields: [{ key: 'b' }, { key: 'a' }] };
    expect(withDefaultLayout(a)).toBe(a);
  });
});
