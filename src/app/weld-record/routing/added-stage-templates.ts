/* Definitions and editable routing rules for routings inserted during work. */
import { StageTemplate } from '../model/workflow-types';

export const REPAIR_STAGE: StageTemplate = {
  classification: 'added', lifecycle: 'repair', status: 'active', id: 'repair', label: 'Repair', required: true, role: 'Foreman',
  description: 'Repair is inserted whenever an NDT is recorded as UNSAT. Repair codes are configurable and are utilized to route the joint further',
  decisionLabel: 'Inspection Results',
};

export const ENGINEERING_HOLD_STAGE: StageTemplate = {
  classification: 'added', lifecycle: 'engineering-hold', status: 'active', id: 'engineering-hold', label: 'Engineering Hold', required: true, role: 'Engineering',
};

export const ADDED_STAGE_TEMPLATES: StageTemplate[] = [
  { ...REPAIR_STAGE, thenRules: [
    { when: [{ field: 'self.allowableThicknessExceededN1', op: 'is', values: ['yes'] }], to: 'rejecting-utrt' },
    { when: [{ field: 'self.allowableThicknessExceededN23', op: 'is', values: ['yes'] }], to: 'rejecting-utrt' },
    { when: [{ field: 'self.repairType', op: 'is', values: ['grind'] }], to: 'rejecting-ndt' },
    { when: [{ field: 'self.repairType', op: 'is', values: ['cut'] }], to: 'fit' },
    { when: [{ field: 'self.repairType', op: 'is', values: ['weld-repair'] }], to: 'add-excavation-ndt' },
  ] },
  { classification: 'added', lifecycle: 'excavation', status: 'active', id: 'excavation-ndt', label: 'Excavation NDT', required: true, role: 'Inspector',
    includeWhen: [[{ field: 'nInd', op: 'is', values: ['3'] }]],
    rejectToStage: 'own-repair', thenRules: [
      { when: [{ field: 'self.originalInspectionType', op: 'is', values: ['pt'] }, { field: 'self.performedInspectionType', op: 'is', values: ['5x'] }], to: 'rejecting-vt5x' },
      { when: [], to: 'rejecting-ndt' },
    ] },
  { classification: 'added', lifecycle: 'excavation', status: 'active', id: 'nqc-excavation-ndt', label: 'NQC Excavation NDT', displayName: 'Excavation NDT', required: true, role: 'NQC Inspector',
    includeWhen: [[{ field: 'nInd', op: 'is', values: ['1', '2'] }]],
    rejectToStage: 'own-repair', thenRules: [
      { when: [{ field: 'self.originalInspectionType', op: 'is', values: ['pt'] }, { field: 'self.performedInspectionType', op: 'is', values: ['5x'] }], to: 'rejecting-vt5x' },
      { when: [], to: 'rejecting-ndt' },
    ] },
  ENGINEERING_HOLD_STAGE,
];
