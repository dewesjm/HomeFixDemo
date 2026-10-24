import { migrateRepairConfirmationForm } from './repair-confirmation-migration';
import { FieldCondition } from './field-conditions';

describe('saved Repair confirmation form', () => {
  it('replaces the obsolete field with both catalog fields and preserves customization', () => {
    const showIf: FieldCondition = { all: [{ source: 'field', key: 'repairType', equals: 'grind' }] };
    const old = { typeId: 'repair', fields: [{ key: 'repairType' }, { key: 'allowableThicknessExceeded', width: 400, required: true, showIf }] };
    const migrated = migrateRepairConfirmationForm(old);
    expect(migrated.fields.map(f => f.key)).toEqual(['repairType', 'allowableThicknessExceededN1', 'allowableThicknessExceededN23']);
    expect(migrated.fields[1].width).toBe(400);
    expect(migrated.fields[1].required).toBeTrue();
    expect(JSON.stringify(migrated.fields[1].showIf)).toContain('grind');
    expect(JSON.stringify(migrated.fields[2].showIf)).toContain('["2","3"]');
    expect(migrateRepairConfirmationForm(migrated)).toBe(migrated);
  });
  it('does not duplicate existing replacements or restore deliberately removed current fields', () => {
    const current = { typeId: 'repair', fields: [{ key: 'repairType' }] };
    expect(migrateRepairConfirmationForm(current)).toBe(current);
    const mixed = { typeId: 'repair', fields: [{ key: 'allowableThicknessExceededN1', required: false }, { key: 'allowableThicknessExceeded' }] };
    expect(migrateRepairConfirmationForm(mixed).fields.map(f => f.key)).toEqual(['allowableThicknessExceededN1', 'allowableThicknessExceededN23']);
  });
});
