import { conditionToWork, workToCondition } from './condition-work';
import { ENGINEERING_OVERRIDE_KEY } from '../../signoff-definition/condition-context';
import { FieldCondition } from '../../signoff-definition/field-conditions';

describe('condition editor working copy', () => {
  it('round-trips nested AND/OR groups, "one of" values and engineering override', () => {
    const cond: FieldCondition = {
      any: [
        { source: 'field', key: 'inspectionType', anyOf: ['mt', 'pt'] },
        { all: [{ source: 'jointDetail', key: 'titanium', equals: 'yes' }, { source: 'stageProperty', key: ENGINEERING_OVERRIDE_KEY, equals: '' }] },
      ],
    };
    expect(workToCondition(conditionToWork(cond))).toEqual(cond);
  });

  it('drops clauses with no field and nested groups left empty, keeping the top group', () => {
    expect(workToCondition({
      op: 'any',
      items: [{ source: 'field', key: '', equals: 'x' }, { op: 'all', items: [{ source: 'jointDetail', key: '', equals: '' }] }],
    })).toEqual({ any: [] });
  });
});
