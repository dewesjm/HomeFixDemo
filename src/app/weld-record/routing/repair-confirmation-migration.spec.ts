import { migrateRepairConfirmationRules } from './repair-confirmation-migration';
import { conditionsMatch, RejectRule } from './step-conditions';
import { JOBS } from '../../data/jobs';

describe('saved Repair confirmation routing rules', () => {
  it('splits the old field by indicator while preserving destinations, priority, operators and other conditions', () => {
    const old: RejectRule[] = [
      { to: 'rejecting-utrt', when: [{ field: 'self.allowableThicknessExceeded', op: 'is', values: ['yes'] }, { field: 'self.repairType', op: 'isNot', values: ['cut'] }] },
      { to: 'fit', when: [] },
    ];
    const migrated = migrateRepairConfirmationRules(old)!;
    expect(migrated.map(r => r.to)).toEqual(['rejecting-utrt', 'rejecting-utrt', 'fit']);
    for (const nInd of ['1', '2', '3']) {
      const key = nInd === '1' ? 'allowableThicknessExceededN1' : 'allowableThicknessExceededN23';
      const self = { id: 'repair', signed: false, signoffInputs: {}, inputs: { [key]: 'yes', repairType: 'grind' } };
      expect(migrated.filter(r => r.to === 'rejecting-utrt' && conditionsMatch([r.when], { ...JOBS[0], nInd }, [], self)).length).toBe(1);
      self.inputs.repairType = 'cut';
      expect(migrated.some(r => r.to === 'rejecting-utrt' && conditionsMatch([r.when], { ...JOBS[0], nInd }, [], self))).toBeFalse();
    }
    expect(old[0].when[0].field).toBe('self.allowableThicknessExceeded');
    expect(migrateRepairConfirmationRules(migrated)).toEqual(migrated);
  });
});
