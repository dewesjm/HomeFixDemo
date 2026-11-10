/* The two inspection Types a routing rule can test: the one that originally failed (recorded when its
   Repair was added) and the one performed here (this routing's Type). Read from what was recorded,
   never a separate flag. */
import { isExcavationNdtStageId, repairIdForExcavation } from '../../data/welding-step-ids';

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
