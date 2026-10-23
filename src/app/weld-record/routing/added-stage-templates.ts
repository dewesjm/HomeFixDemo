/* Definitions and editable routing rules for routings inserted during work. */
import { StageTemplate } from '../model/workflow-types';

export const REPAIR_STAGE: StageTemplate = {
  id: 'repair', label: 'Repair', required: true, role: 'Foreman', fields: [
    { key: 'repairType', label: 'Repair Code', type: 'select', required: true,
      options: [{ label: 'Grind Only', value: 'grind' }, { label: 'Weld Repair', value: 'weld-repair' }, { label: 'Cut', value: 'cut' }] },
    { key: 'allowableThicknessExceeded', label: 'Allowable thickness exceeded - Volumetric inspection (UT/RT) is required', type: 'checkbox' },
  ], signoffFields: [],
  decisionLabel: 'Inspection Results',
};

export const ENGINEERING_HOLD_STAGE: StageTemplate = {
  id: 'engineering-hold', label: 'Engineering Hold', required: true, role: 'Engineering', fields: [], signoffFields: [],
};

export const ADDED_STAGE_TEMPLATES: StageTemplate[] = [
  { ...REPAIR_STAGE, thenRules: [
    { when: [{ field: 'self.allowableThicknessExceeded', op: 'is', values: ['yes'] }], to: 'rejecting-utrt' },
    { when: [{ field: 'self.repairType', op: 'is', values: ['grind'] }], to: 'rejecting-ndt' },
    { when: [{ field: 'self.repairType', op: 'is', values: ['cut'] }], to: 'fit' },
    { when: [{ field: 'self.repairType', op: 'is', values: ['weld-repair'] }], to: 'add-excavation-ndt' },
  ] },
  { id: 'excavation-ndt', label: 'Excavation NDT', required: true, role: 'Inspector',
    fields: [{ key: 'typeChangedFromPtTo5x', label: 'Type was changed to 5X from PT', type: 'checkbox' }],
    rejectToStage: 'own-repair', thenRules: [
      { when: [{ field: 'self.typeChangedFromPtTo5x', op: 'is', values: ['yes'] }], to: 'rejecting-vt5x' },
      { when: [], to: 'rejecting-ndt' },
    ] },
  ENGINEERING_HOLD_STAGE,
];
export const isAddedTemplateId = (id: string) => ADDED_STAGE_TEMPLATES.some(t => t.id === id);
