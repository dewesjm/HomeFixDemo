/* Admin > Attribute Code Exceptions rows in plain words, for the table, its export and the notes on
   Routing Settings and Signoff Types By Routing */
import { allStepAnswerFields, describeConditions, JOINT_DETAIL_FIELDS, StepConditionField } from '../routing/step-conditions';
import { typeLabel } from '../signoff-definition/routing-signoff-types';
import { AttributeCodeException, FINAL_WELD_PROCESS, ROOT_WELD_PROCESS, SHIPBOARD_FIELD } from './attribute-code-exceptions';

/* what an Applies when condition can read: Joint Details, Fabrication Location's Shipboard flag,
   Root's and Final Weld's Weld Process, and each MT/PT routing's Type and ID accessible answer */
export function exceptionConditionFields(): StepConditionField[] {
  const answers = allStepAnswerFields('Welding');
  return [
    ...JOINT_DETAIL_FIELDS.map(f => ({ ...f, valueLabel: (v: string) => f.valueLabel?.(v) ?? (v || 'Blank') })),
    { key: SHIPBOARD_FIELD, label: 'Fabrication Location is shipboard (once Fit is signed)', values: ['Yes', 'No'], stepAnswer: true, get: () => '' },
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
