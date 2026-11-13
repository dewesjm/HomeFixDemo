import { clauseChoiceId, clauseChoices, withSavedChoice } from './condition-choices';

const fields = [{ key: 'weldColor', label: 'Weld Color', values: [] }, { key: 'partial', label: 'Partial', values: [], yesNo: true }];
const labels = (list: { label: string }[]) => list.map(c => c.label);

describe('condition clause list', () => {
  it('names every entry by where it comes from, in one list', () => {
    const all = labels(clauseChoices(fields, false));
    ['This form: Weld Color', 'Joint Details: N Ind.', 'Calculated: Either material is titanium', 'Fabrication: Joining Item MIC',
      'Calculated: Fabrication Location is shipboard (once Fit is signed)', 'Routing ID matches', 'Rejected phase has RT/UT', 'Engineering override']
      .forEach(l => expect(all).toContain(l));
    expect(all.some(l => l.startsWith('Fabrication: Fabrication'))).toBeFalse();
    expect(new Set(clauseChoices(fields, false).map(c => c.id)).size).toBe(all.length);
  });

  it('offers only this form and Engineering override on a Prepopulated from condition', () => {
    expect(labels(clauseChoices(fields, true))).toEqual(['This form: Weld Color', 'This form: Partial', 'Engineering override']);
  });

  it('starts each clause the way its old picker did', () => {
    const start = (id: string) => clauseChoices(fields, false).find(c => c.id === id)!.clause;
    expect(start('field|weldColor')).toEqual({ source: 'field', key: 'weldColor', equals: '' });
    expect(start('field|partial')).toEqual({ source: 'field', key: 'partial', equals: 'yes' });
    expect(start('jointDetail|ss')).toEqual({ source: 'jointDetail', key: 'ss', equals: '' });
    expect(start('jointDetail|sfff')).toEqual({ source: 'jointDetail', key: 'sfff', equals: 'Yes' });
    expect(start('jointDetail|drawing')).toEqual({ source: 'jointDetail', key: 'drawing', equals: '' });
    expect(start('rejectedUtrt')).toEqual({ source: 'rejectedUtrt', key: '', equals: 'yes' });
    expect(start('stepId')).toEqual({ source: 'stepId', key: '', equals: '' });
    expect(start('engineering')).toEqual({ source: 'engineering', key: '', equals: '' });
  });

  it('a new clause has nothing picked', () => {
    expect(clauseChoiceId({ source: 'field', key: '' })).toBe('');
  });

  it('keeps a saved clause the list does not offer', () => {
    const list = clauseChoices(fields, false);
    expect(withSavedChoice(list, { source: 'jointDetail', key: 'ss', equals: 'Yes' })).toBe(list);
    expect(withSavedChoice(list, { source: 'field', key: 'gone', equals: 'x' })[0].label).toBe('This form: gone');
    const stepOnly = clauseChoices(fields, true);
    expect(withSavedChoice(stepOnly, { source: 'jointDetail', key: 'ss', equals: 'Yes' })[0].label).toBe('Joint Details: SS');
    expect(withSavedChoice(stepOnly, { source: 'stepId', key: '', equals: 'x' })[0].label).toBe('Routing ID matches');
  });
});
