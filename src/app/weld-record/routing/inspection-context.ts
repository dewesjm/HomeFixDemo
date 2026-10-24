/* Inspection facts are derived from recorded context and the current Type, never a replacement flag. */
import { isExcavationNdtStageId, repairIdForExcavation } from './step-ids';

export interface InspectionContextStage {
  id: string;
  inputs: Record<string, string>;
  inspectionType?: string;
  insertion?: { originInspectionType?: string };
}

export function originalInspectionType(stage: InspectionContextStage, stages: InspectionContextStage[]): string {
  const repair = isExcavationNdtStageId(stage.id)
    ? stages.find(s => s.id === repairIdForExcavation(stage.id)) : undefined;
  return stage.insertion?.originInspectionType ?? repair?.inputs['originInspectionType'] ?? stage.inputs['originInspectionType'] ?? '';
}

export function performedInspectionType(stage: InspectionContextStage): string {
  return stage.inspectionType ?? '';
}
