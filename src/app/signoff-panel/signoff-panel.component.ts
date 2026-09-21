import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideBadgeCheck, LucideCheck, LucideLockOpen } from '@lucide/angular';
import { Job } from '../data/jobs';
import { WorkflowStage, StageField, SignoffField, StageResult, STAGE_RESULT_OPTIONS, FabricationField } from '../data/workflow';

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
  canReopen: (stage: WorkflowStage, idx: number) => boolean;
  visibleFields: (stage: WorkflowStage) => StageField[];
  visibleSignoffFields: (stage: WorkflowStage) => SignoffField[];
  startsGroup: (stage: WorkflowStage, field: StageField) => boolean;
  fieldError: (stageId: string, fieldKey: string) => string | undefined;
  getFabValue: (fieldKey: string) => string;
  getReviewValue: (fieldKey: string) => string;
  fabFieldRequired: (f: FabricationField) => boolean;
  defaultRoutingOption: (stage: WorkflowStage) => string;
  inspectionTypeRequired: (stage: WorkflowStage) => boolean;
  jointDesignRequiresInsert: () => boolean;
  jointDesignRequiresBackingRing: () => boolean;
  hasOverrideFields: (stage: WorkflowStage) => boolean;

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
  reopenStage: (stage: WorkflowStage) => void;
}

/* Layout of the weld-stage form (Tack / Root / Layer / Final / Fit weld build-up). */
interface WeldRow { keys: string[]; width: number | null; spacerBefore?: string }
interface WeldSection {
  title?: string;
  rows: WeldRow[];
  kind?: 'checkbox';
  when?: (st: WorkflowStage, ctx: SignoffContext) => boolean;
}

const READONLY_LIMITS = new Set(['phMin', 'phMax', 'ipMin', 'ipMax']);
const FILLER_KEYS = new Set(['fillerMetalType', 'fillerMetalSize', 'fillerMetalMic']);

const WELD_SECTIONS: WeldSection[] = [
  { rows: [{ keys: ['weldProcedure', 'wtn', 'weldProcess'], width: 200 }] },
  { rows: [{ keys: ['qualificationCheck'], width: 400 }] },
  { title: 'PH/IP Requirements', rows: [{ keys: ['phMin', 'phMax', 'ipMin', 'ipMax'], width: 120 }] },
  { title: 'Override Requirements', when: (st, ctx) => ctx.hasOverrideFields(st), rows: [
    { keys: ['overridePhMin', 'overridePhMax', 'overrideIpMin', 'overrideIpMax'], width: 120 },
    { keys: ['overrideNote'], width: null },
  ] },
  { title: 'PH/IP Actuals', rows: [{ keys: ['actualPh', 'actualIp'], width: 120, spacerBefore: 'actualIp' }] },
  { when: (_st, ctx) => ctx.job.nInd === '1', rows: [{ keys: ['weldPosition'], width: 200 }] },
  { kind: 'checkbox', when: st => st.id === 'root-weld', rows: [{ keys: ['consumableInsertOnly'], width: null }] },
  { rows: [{ keys: ['fillerMetalType', 'fillerMetalSize', 'fillerMetalMic'], width: 160 }] },
  { when: st => st.id === 'root-weld' || st.id === 'final-weld', rows: [{ keys: ['performed5x'], width: 400 }] },
  { rows: [{ keys: ['comments'], width: null }] },
];

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

  weldSections = WELD_SECTIONS;

  /* the two joint members a weld build-up can affect, with their MCL and MIC-verified keys */
  affectedItemSlots = [
    { key: 'joiningItem', mcl: 'mcl1', micVerified: 'micVerified1' },
    { key: 'joinToItem', mcl: 'mcl2', micVerified: 'micVerified2' },
  ] as const;

  isAffected(key: string): boolean {
    return (this.stage().inputs['affectedItems'] as string | undefined)?.includes(key) ?? false;
  }

  sectionVisible(sec: WeldSection): boolean {
    return !sec.when || sec.when(this.stage(), this.ctx());
  }

  rowFields(row: WeldRow): StageField[] {
    const visible = this.ctx().visibleFields(this.stage());
    return row.keys.map(k => visible.find(f => f.key === k)).filter((f): f is StageField => !!f);
  }

  fieldsEditable(): boolean {
    return this.ctx().inputsEditable(this.stage(), this.ctx().selectedRouting());
  }

  isReadonlyLimit(f: StageField): boolean {
    return READONLY_LIMITS.has(f.key);
  }

  /* Weld Process follows the WTN; filler fields follow the Consumable Insert checkbox */
  isLocked(f: StageField): boolean {
    return f.key === 'weldProcess'
      || (FILLER_KEYS.has(f.key) && this.stage().inputs['consumableInsertOnly'] === 'yes');
  }

  onSelect(f: StageField, value: string | null) {
    if (f.key === 'performed5x') this.ctx().on5xChange(this.stage(), value ?? '');
    else this.ctx().stageSelectChange(this.stage(), f, value);
  }
}
