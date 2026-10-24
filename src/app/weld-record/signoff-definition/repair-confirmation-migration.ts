/* Preserve form customization while replacing the obsolete single thickness checkbox. */
import type { TypeDefinition } from './step-field-config';
import { andConditions, FieldCondition } from './field-conditions';

export function migrateRepairConfirmationForm(definition: TypeDefinition): TypeDefinition {
  if (!definition.fields.some(f => f.key === 'allowableThicknessExceeded')) return definition;
  return { ...definition, fields: definition.fields.flatMap(field => {
    if (field.key !== 'allowableThicknessExceeded') return [field];
    return [{ suffix: 'N1', values: ['1'] }, { suffix: 'N23', values: ['2', '3'] }].flatMap(({ suffix, values }) => {
      const key = `${field.key}${suffix}`;
      if (definition.fields.some(f => f.key === key)) return [];
      const indicator: FieldCondition = { all: [{ source: 'jointDetail', key: 'nInd', anyOf: values }] };
      return [{ ...field, key, ...(field.showIf ? { showIf: andConditions(field.showIf, indicator) } : {}) }];
    });
  }) };
}
