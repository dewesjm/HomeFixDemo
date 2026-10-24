/* Definitions and editable routing rules for routings inserted during work. */
import { StageTemplate } from '../model/workflow-types';

export const REPAIR_STAGE: StageTemplate = {
  classification: 'added', lifecycle: 'repair', status: 'active', id: 'repair', label: 'Repair', required: true, role: 'Foreman',
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
    roleRules: [{ when: [{ field: 'nInd', op: 'is', values: ['1', '2'] }], role: 'NQC Inspector' }],
    rejectToStage: 'own-repair', thenRules: [
      { when: [{ field: 'self.typeChangedFromPtTo5x', op: 'is', values: ['yes'] }], to: 'rejecting-vt5x' },
      { when: [], to: 'rejecting-ndt' },
    ] },
  ENGINEERING_HOLD_STAGE,
];
