import { getRepairCodes, setRepairCodes } from '../../data/repair-codes';
import { repairCodeOptions } from './repair-code-options';
import { lookupCatalogField } from './field-catalog';
import { stageConditionFields } from '../routing/step-conditions';
import { stageFieldOptions } from '../joint-page/rules/stage-form';
import { stageFromTemplate, nextRepairStage } from '../routing/added-steps';
import { conditionText } from './field-rules';

describe('Repair Code form and condition options', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  it('resolves saved names and retired choices in form and routing condition editors', () => {
    const rows = [...getRepairCodes(), { code: 'extra', name: 'Extra inspection', active: true }];
    setRepairCodes(rows);
    const field = () => stageConditionFields({ id: 'repair-2' }).find(f => f.key === 'self.repairType')!;
    expect(field().values).toContain('extra');
    expect(field().valueLabel!('extra')).toBe('Extra inspection');
    setRepairCodes(rows.map(r => r.code === 'extra' ? { ...r, name: 'Recheck', active: false } : r));
    expect(repairCodeOptions().map(r => r.value)).not.toContain('extra');
    expect(field().valueLabel!('extra')).toBe('Recheck (inactive)');
    const stage = stageFromTemplate(nextRepairStage([]), { repairType: 'extra' });
    const catalog = lookupCatalogField('repairType')!;
    expect(catalog.options!.some(o => o.value === 'extra')).toBeTrue();
    expect(stageFieldOptions(catalog, stage, { job: undefined, stages: [stage], offListUnlocked: false }).options)
      .toContain({ value: 'extra', label: 'Recheck (inactive)' });
    stage.inputs = {};
    expect(stageFieldOptions(catalog, stage, { job: undefined, stages: [stage], offListUnlocked: false }).options!.map(o => o.value)).not.toContain('extra');
    expect(conditionText({ all: [{ source: 'field', key: 'repairType', equals: 'extra' }] })).toContain('Repair Code');
  });
});
