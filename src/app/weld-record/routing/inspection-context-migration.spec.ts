import { migrateInspectionContextRules } from './inspection-context-migration';
import { conditionsMatch, ConditionClause, RejectRule } from './step-conditions';
import { JOBS } from '../../data/jobs';

describe('Saved inspection exception rule migration', () => {
  it('preserves positive, negative, alternative and contains semantics, destinations and priority', () => {
    const clauses: ConditionClause[] = [
      { field: 'self.typeChangedFromPtTo5x', op: 'is', values: ['yes'] },
      { field: 'self.typeChangedFromPtTo5x', op: 'isNot', values: ['yes'] },
      { field: 'self.typeChangedFromPtTo5x', op: 'is', values: [''] },
      { field: 'self.typeChangedFromPtTo5x', op: 'is', values: ['yes', ''] },
      { field: 'self.typeChangedFromPtTo5x', op: 'isNot', values: ['yes', ''] },
      { field: 'self.typeChangedFromPtTo5x', op: 'contains', values: ['ES'] },
      { field: 'self.typeChangedFromPtTo5x', op: 'contains', values: [''] },
    ];
    for (const clause of clauses) {
      const old: RejectRule[] = [{ to: 'rejecting-vt5x', when: [clause, { field: 'nInd', op: 'is', values: ['3'] }] }, { to: 'own-repair', when: [] }];
      const before = structuredClone(old);
      const migrated = migrateInspectionContextRules(old)!;
      for (const [original, performed] of [['pt', '5x'], ['pt', 'pt'], ['mt', '5x'], ['', '']]) {
        const self = { id: 'excavation-ndt', signed: false, inspectionType: performed, signoffInputs: {},
          inputs: { originInspectionType: original, typeChangedFromPtTo5x: original === 'pt' && performed === '5x' ? 'yes' : '' } };
        for (const nInd of ['1', '3']) {
          const job = { ...JOBS[0], nInd };
          const match = (rules: RejectRule[]) => rules.find(r => conditionsMatch([r.when], job, [], self))?.to;
          expect(match(migrated)).withContext(JSON.stringify(clause)).toBe(match(old));
        }
      }
      expect(migrated.flatMap(r => r.when).some(c => c.field === clause.field)).toBeFalse();
      expect(migrateInspectionContextRules(migrated)).toEqual(migrated);
      expect(old).toEqual(before);
    }
  });
});
