import { WorkflowStage } from '../model/workflow-types';

/* "ID is accessible" on a signoff whose routing has accessible rules (Admin > Attribute Code Exceptions):
   it must be answered, and the picked Type must allow the answer */
export function attributeAccessError(stage: Pick<WorkflowStage, 'attributeRules' | 'inputs' | 'inspectionType'>): string {
  const rules = stage.attributeRules?.accessible ?? [];
  if (!rules.length) return '';
  const access = stage.inputs['idAccessible'];
  if (access !== 'yes' && access !== 'no') return 'Answer ID accessibility for this signoff';
  const rule = rules.find(r => r.type === stage.inspectionType);
  return rule && rule.answer !== access ? `This choice requires ID accessibility ${rule.answer === 'yes' ? 'Yes' : 'No'} on this signoff` : '';
}
