import { FillSource, OpenCondition, THIS_STEP, WTN, applyOpenCondition, fillChoiceId, fillChoices, fillSourceId } from './definition-edits';
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

describe('Prepopulated from list', () => {
  const sources: FillSource[] = [
    { stepId: THIS_STEP, stepLabel: 'This signoff', fields: [{ key: 'weldColor', label: 'Weld Color' }] },
    { stepId: WTN, stepLabel: 'WTN', fields: [{ key: 'weldProcess', label: 'Weld Process' }] },
    { stepId: 'root-weld', stepLabel: 'Root Weld', fields: [{ key: 'weldProcess', label: 'Weld Process' }] },
  ];
  const none = { stepId: '', key: '' };
  const labels = (list: { label: string }[]) => list.map(c => c.label);

  it('lists every source\'s fields in one list, named by source', () => {
    expect(labels(fillChoices(sources, none, k => k))).toEqual(['This signoff: Weld Color', 'WTN: Weld Process', 'Root Weld: Weld Process']);
  });

  it('keeps a saved pick that no source lists any more', () => {
    expect(labels(fillChoices(sources, { stepId: 'root-weld', key: 'gone' }, () => 'Gone'))[0]).toBe('Root Weld: Gone');
    expect(fillChoices(sources, { stepId: WTN, key: 'weldProcess' }, k => k).length).toBe(3);
  });

  it('gives each entry the id the picker selects it by', () => {
    expect(fillChoices(sources, none, k => k)[1].id).toBe(fillChoiceId(WTN, 'weldProcess'));
  });
});
