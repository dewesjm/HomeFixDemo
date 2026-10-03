/* What the joint page hands the Signoff panel and its parts: the joint, its workflow, and the
   page's rules and actions for the current step */
import { Job } from '../../data/jobs';
import { WorkflowStage, StageField, SignoffField, StageResult, STAGE_RESULT_OPTIONS, FabricationField } from '../../data/workflow';

export interface SignoffContext {
  job: Job;
  wf: () => { stages: WorkflowStage[]; fabricationData: Record<string, string>; signoffRecords: any[] };
  selectedRouting: () => number;
  jobComplete: () => boolean;
  soldSigned: () => boolean;
  fabLocked: () => boolean;
  rejectedCount: () => number;
  resultOptions: typeof STAGE_RESULT_OPTIONS;
  fabErrors: () => Record<string, string>;
  fieldErrors: () => Record<string, string>;

  // Methods
  editable: (stage: WorkflowStage) => boolean;
  inputsEditable: (stage: WorkflowStage, idx: number) => boolean;
  canSignStage: (stage: WorkflowStage) => boolean;
  visibleFields: (stage: WorkflowStage) => StageField[];
  visibleSignoffFields: (stage: WorkflowStage) => SignoffField[];
  startsGroup: (stage: WorkflowStage, field: StageField) => boolean;
  fieldError: (stageId: string, fieldKey: string) => string | undefined;
  clearFieldError: (stageId: string, fieldKey: string) => void;
  getFabValue: (fieldKey: string) => string;
  getReviewValue: (fieldKey: string) => string;
  fabFieldRequired: (f: FabricationField) => boolean;
  defaultRoutingOption: (stage: WorkflowStage) => string;
  inspectionTypeRequired: (stage: WorkflowStage) => boolean;
  jointDesignRequiresInsert: () => boolean;
  jointDesignRequiresBackingRing: () => boolean;
  hasOverrideFields: (stage: WorkflowStage) => boolean;
  routePreviewLabel: (stage: WorkflowStage) => string;
  holdNote: () => string;
  /* back to the list the joint was opened from, as after any signoff */
  leaveAfterSignoff: () => void;
  fieldWarning: (stage: WorkflowStage, fieldKey: string) => string;
  reportedDeviations: (stage: WorkflowStage) => string[];
  foremanOverride: (stage: WorkflowStage) => void;
  engineeringOverrideAvailable: (stage: WorkflowStage) => boolean;
  engineeringOverride: (stage: WorkflowStage) => void;
  removeForemanOverride: (stage: WorkflowStage, index: number) => void;
  assignedLocked: (stage: WorkflowStage, fieldKey: string) => boolean;

  // Actions
  stageInputBlur: (stage: WorkflowStage, field: StageField, value: string) => void;
  stageSelectChange: (stage: WorkflowStage, field: StageField, value: string | null) => void;
  blurSignoffField: (stage: WorkflowStage, field: SignoffField, value: string) => void;
  signoffSelectChange: (stage: WorkflowStage, field: SignoffField, value: string | null) => void;
  signoffCheckboxChange: (stage: WorkflowStage, field: SignoffField, checked: boolean) => void;
  toggleAffectedItem: (stage: WorkflowStage, item: string, event: Event) => void;
  onConsumableInsertChange: (stage: WorkflowStage, value: string) => void;
  on5xChange: (stage: WorkflowStage, value: string) => void;
  updateRoutingType: (stage: WorkflowStage, value: string) => void;
  setInspectionType: (value: string) => void;
  setStageResult: (stage: WorkflowStage, result: StageResult) => void;
  signStage: (stage: WorkflowStage) => void;
}
