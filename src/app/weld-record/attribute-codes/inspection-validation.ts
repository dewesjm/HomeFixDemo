import { WorkflowStage } from '../model/workflow-types';

/* Validate the performed method against its frozen inspection obligation. */
export function attributeInspectionError(stage: WorkflowStage): string {
  const obligation = stage.attributeInspection;
  if (!obligation) return '';
  const method = obligation.methods.find(m => m.type === stage.inspectionType);
  if (!method || !stage.typeOptions?.some(o => o.value === method.type)) return 'Select an inspection permitted by the attribute requirement';
  const access = stage.inputs['idAccessible'];
  if (obligation.methods.some(m => m.access) && !['yes', 'no'].includes(access)) return 'Answer ID accessibility for this signoff';
  if (method.access && method.access !== access) return `This choice requires ID accessibility ${method.access === 'yes' ? 'Yes' : 'No'} on this signoff`;
  const performed = Number(stage.inputs['degreeRt'] || 0);
  if (method.minRt && (!Number.isFinite(performed) || performed < method.minRt)) return `Degree of RT Performed must be at least ${method.minRt}`;
  return '';
}
