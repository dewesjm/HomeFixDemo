import { InspectionContextStage, originalInspectionType, performedInspectionType } from './inspection-context';
import { conditionsMatch, stageConditionFields } from './step-conditions';
import { JOBS } from '../../data/jobs';

const record = (id: string, original = '', performed = '') => ({ id, signed: false, inputs: { originInspectionType: original }, signoffInputs: {}, inspectionType: performed });

describe('General inspection routing facts', () => {
  it('resolves each regular/NQC Excavation from its own Repair round, retaining original Type when the performed Type changes', () => {
    const stages = [record('repair', 'pt'), record('repair-2', 'ut'), record('excavation-ndt', '', '5x'), record('nqc-excavation-ndt-2', '', 'rt')];
    expect(originalInspectionType(stages[2], stages)).toBe('pt');
    expect(originalInspectionType(stages[3], stages)).toBe('ut');
    stages[3].inspectionType = 'vt';
    expect(originalInspectionType(stages[3], stages)).toBe('ut');
    expect(performedInspectionType(stages[3])).toBe('vt');
    expect(originalInspectionType(record('excavation-ndt-3'), stages)).toBe('');
  });
  it('reads captured context for Repair and ordinary inserted work without looking up a corrected original inspection', () => {
    const inserted: InspectionContextStage = { ...record('added:extra:2', '', 'mt'), insertion: { originInspectionType: 'pt' } };
    expect(originalInspectionType(inserted, [])).toBe('pt');
    expect(originalInspectionType(record('repair-2', '5x'), [])).toBe('5x');
    expect(originalInspectionType(record('fit'), [])).toBe('');
  });
  it('offers labeled general facts and matches another Type combination with ordinary conditions', () => {
    const fields = stageConditionFields({ id: 'nqc-excavation-ndt-2' });
    const original = fields.find(f => f.key === 'self.originalInspectionType')!;
    expect(original.label).toContain('Original rejecting inspection Type');
    expect(original.valueLabel!('pt')).toBe('PT');
    expect(fields.some(f => f.key === 'self.typeChangedFromPtTo5x')).toBeFalse();
    const repair = record('repair-2', 'ut');
    const excavation = record('nqc-excavation-ndt-2', '', 'rt');
    const rules = [[{ field: 'self.originalInspectionType', op: 'is' as const, values: ['ut'] },
      { field: 'self.performedInspectionType', op: 'is' as const, values: ['rt'] }]];
    expect(conditionsMatch(rules, JOBS[0], [repair, excavation], excavation)).toBeTrue();
    excavation.inspectionType = 'pt';
    expect(conditionsMatch(rules, JOBS[0], [repair, excavation], excavation)).toBeFalse();
  });
});
