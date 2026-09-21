import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideBadgeCheck, LucideCheck, LucideLockOpen } from '@lucide/angular';
import { Job } from '../data/jobs';
import { WorkflowStage, StageField, SignoffField, StageResult, STAGE_RESULT_OPTIONS, FabricationField } from '../data/workflow';

export interface SignoffContext {
  job: Job;
  wf: () => { stages: WorkflowStage[]; fabricationData: Record<string, string>; signoffRecords: any[] };
  selectedStep: () => number;
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
  canReopen: (stage: WorkflowStage, idx: number) => boolean;
  visibleFields: (stage: WorkflowStage) => StageField[];
  visibleSignoffFields: (stage: WorkflowStage) => SignoffField[];
  startsGroup: (stage: WorkflowStage, field: StageField) => boolean;
  fieldError: (stageId: string, fieldKey: string) => string | undefined;
  getFabValue: (fieldKey: string) => string;
  getReviewValue: (fieldKey: string) => string;
  fabFieldRequired: (f: FabricationField) => boolean;
  defaultStepOption: (stage: WorkflowStage) => string;
  jointDesignRequiresInsert: () => boolean;
  jointDesignRequiresBackingRing: () => boolean;

  // Actions
  stageInputBlur: (stage: WorkflowStage, field: StageField, value: string) => void;
  stageSelectChange: (stage: WorkflowStage, field: StageField, value: string | null) => void;
  blurSignoffField: (stage: WorkflowStage, field: SignoffField, value: string) => void;
  signoffSelectChange: (stage: WorkflowStage, field: SignoffField, value: string | null) => void;
  signoffCheckboxChange: (stage: WorkflowStage, field: SignoffField, checked: boolean) => void;
  toggleAffectedItem: (stage: WorkflowStage, item: string, event: Event) => void;
  onConsumableInsertChange: (stage: WorkflowStage, value: string) => void;
  on5xChange: (stage: WorkflowStage, value: string) => void;
  updateStepType: (stage: WorkflowStage, value: string) => void;
  setInspectionType: (value: string) => void;
  setStageResult: (stage: WorkflowStage, result: StageResult) => void;
  signStage: (stage: WorkflowStage) => void;
  reopenStage: (stage: WorkflowStage) => void;
}

@Component({
  selector: 'app-signoff-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideBadgeCheck, LucideCheck, LucideLockOpen],
  templateUrl: './signoff-panel.component.html'
})
export class SignoffPanelComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
  stageIndex = input.required<number>();

  visFields = computed(() => this.ctx().visibleFields(this.stage()));
  visSignoffFields = computed(() => this.ctx().visibleSignoffFields(this.stage()));
}
