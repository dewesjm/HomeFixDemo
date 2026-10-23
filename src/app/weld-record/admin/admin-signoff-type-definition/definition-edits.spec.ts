import { OpenCondition, THIS_STEP, WTN, applyOpenCondition, fillSourceId } from './definition-edits';
import { conditionToWork } from './condition-work';

const open = (o: Partial<OpenCondition>): OpenCondition =>
  ({ condKey: null, condKind: 'show', condGroup: conditionToWork(undefined), fillStepId: '', fillFieldKey: '', ...o });

describe('applyOpenCondition', () => {
  const clause = { source: 'field' as const, key: 'wtn', equals: 'x' };

  it('leaves the fields alone when no editor is open', () => {
    const acts = [{ key: 'wtn' }];
    expect(applyOpenCondition(acts, open({}))).toBe(acts);
  });

  it('writes a Show when to the open field only', () => {
    const out = applyOpenCondition([{ key: 'wtn' }, { key: 'weldProcess' }],
      open({ condKey: 'weldProcess', condGroup: conditionToWork({ all: [clause] }) }));
    expect(out[0]).toEqual({ key: 'wtn' });
    expect(out[1].showIf).toEqual({ all: [clause] });
  });

  it('a fill with no source field means not prepopulated', () => {
    const out = applyOpenCondition([{ key: 'weldProcess', fill: { from: 'wtn', fieldKey: 'weldProcess', when: { all: [] } } }],
      open({ condKey: 'weldProcess', condKind: 'fill', fillStepId: WTN }));
    expect(out[0].fill?.fieldKey).not.toBe('weldProcess');
  });

  it('maps fill sources to the picker and back', () => {
    expect(fillSourceId({ from: 'wtn', fieldKey: 'a', when: { all: [] } })).toBe(WTN);
    expect(fillSourceId({ from: 'thisStep', fieldKey: 'a', when: { all: [] } })).toBe(THIS_STEP);
    expect(fillSourceId({ stepId: 'fit', fieldKey: 'a', when: { all: [] } })).toBe('fit');
    expect(fillSourceId(undefined)).toBe('');
  });
});
