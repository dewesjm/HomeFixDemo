/* Admin > Attribute Code Exceptions rows in plain words, for the table, its export and the notes on
   Routing Settings and Signoff Type to Routing */
import { describeConditions } from '../conditions-logic/condition-text';
import { ConditionCatalogField } from '../catalogs/field-catalog';
import { allStepAnswerFields, FABRICATION_DEPENDENT_FIELDS, JOINT_DETAIL_FIELDS } from '../catalogs/field-choices';
import { typeLabel } from '../../data/signoff-types';
import { AttributeCodeException, FINAL_WELD_PROCESS, ROOT_WELD_PROCESS } from '../../data/attribute-code-exceptions';

/* what an Applies when condition can read: Joint Details, Fabrication,
   Root's and Final Weld's Weld Process, and each MT/PT routing's Type and ID accessible answer */
export function exceptionConditionFields(): ConditionCatalogField[] {
  const answers = allStepAnswerFields();
  return [
    ...JOINT_DETAIL_FIELDS.map(f => ({ ...f, valueLabel: (v: string) => f.valueLabel?.(v) ?? (v || 'Blank') })),
    ...FABRICATION_DEPENDENT_FIELDS,
    ...[ROOT_WELD_PROCESS, FINAL_WELD_PROCESS].flatMap(key => answers.filter(f => f.key === key)),
    ...answers.filter(f => /^step\.(nqc-)?\w+-ndt-mtpt\.(inspectionType|idAccessible)$/.test(f.key)),
  ];
}

export const appliesWhenText = (row: AttributeCodeException) =>
  row.when?.length ? describeConditions(row.when, exceptionConditionFields()) : 'Always';

export const routingChangeText = (row: AttributeCodeException) =>
  row.routingChange === 'add' ? 'Add' : row.routingChange === 'drop' ? 'Drop' : '-';

export function typesText(row: AttributeCodeException): string {
  if (!row.typesMode || !row.types?.length) return '-';
  return `${row.typesMode === 'only' ? 'Only' : 'Add'}: ${row.types.map(typeLabel).join(', ')}`;
}

export function accessibleText(row: AttributeCodeException): string {
  const rules = (row.accessible ?? []).map(a => `${typeLabel(a.type)}: ${a.answer === 'yes' ? 'Yes' : 'No'}`);
  return [...(row.askAccessible ? ['Always asked'] : []), ...rules].join('; ') || '-';
}

export const minRtText = (row: AttributeCodeException) => row.minRt ? `${row.minRt}` : '-';
