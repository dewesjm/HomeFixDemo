import { insertionTriggers } from './insertion-triggers';
import { StageTemplate } from '../../model/workflow-types';

describe('insertion condition sources', () => {
  const source: StageTemplate = { id: 'inspection', label: 'Inspection', required: true, rejectToStage: 'repair', thenRules: [{ when: [], to: 'insert:extra' }] };
  it('identifies default rejects, accepted insertions and their editable source', () => {
    expect(insertionTriggers([source], 'repair')).toEqual([{ sourceId: 'inspection', mode: 'reject', label: 'Inspection: UNSAT' }]);
    expect(insertionTriggers([source], 'extra')[0]).toEqual(jasmine.objectContaining({ sourceId: 'inspection', mode: 'then' }));
    expect(insertionTriggers([source], 'engineering-hold').at(-1)).toEqual({ label: 'Accepted deviation at signoff (automatic)' });
  });
  it('omits unreachable rules and a default shadowed by an unconditional reject', () => {
    const rules = [{ when: [], to: 'engineering-hold' }, { when: [], to: 'repair' }];
    expect(insertionTriggers([{ ...source, rejectRules: rules }], 'repair')).toEqual([]);
  });
});
