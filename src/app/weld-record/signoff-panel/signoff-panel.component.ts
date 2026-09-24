import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideBadgeCheck, LucideCheck, LucideLockOpen, LucideChevronRight, LucideChevronDown } from '@lucide/angular';
import { Job } from '../../data/jobs';
import { WorkflowStage, StageField, SignoffField, StageResult, STAGE_RESULT_OPTIONS, FabricationField, READONLY_LIMIT_KEYS, isFieldLocked, ACTUAL_REQUIREMENT, hasDecision, isExcavationNdtStageId } from '../../data/workflow';
import { requiresTraceability } from '../../data/mcl-traceability';
import { PersonSearchInputComponent } from '../../shared/person-search-input.component';

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
  clearFieldError: (stageId: string, fieldKey: string) => void;
  getFabValue: (fieldKey: string) => string;
  getReviewValue: (fieldKey: string) => string;
  fabFieldRequired: (f: FabricationField) => boolean;
  defaultRoutingOption: (stage: WorkflowStage) => string;
  inspectionTypeRequired: (stage: WorkflowStage) => boolean;
  jointDesignRequiresInsert: () => boolean;
  jointDesignRequiresBackingRing: () => boolean;
  hasOverrideFields: (stage: WorkflowStage) => boolean;
  repairRouteLabel: (stage: WorkflowStage) => string;

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
/* width applies to every field in the row; widths overrides it for named fields */
interface WeldRow { keys: string[]; width: number | null; widths?: Record<string, number>; spacerBefore?: string }
interface WeldSection {
  title?: string;
  rows: WeldRow[];
  kind?: 'checkbox';
  when?: (st: WorkflowStage, ctx: SignoffContext) => boolean;
}

interface WeldGroup { title?: string; sections: WeldSection[] }

const WELD_GROUPS: WeldGroup[] = [
  { sections: [
    { rows: [{ keys: ['weldProcedure', 'wtn', 'weldProcess'], width: 200, widths: { weldProcedure: 320, wtn: 320 } }] },
    { rows: [{ keys: ['qualificationCheck'], width: 400 }] },
    { kind: 'checkbox', when: st => st.id === 'root-weld', rows: [{ keys: ['consumableInsertOnly'], width: null }] },
    { rows: [{ keys: ['fillerMetalType', 'fillerMetalSize', 'fillerMetalMic'], width: 160, widths: { fillerMetalMic: 240 } }] },
  ] },
  { title: 'Preheat/Interpass', sections: [
    { title: 'Requirements', rows: [{ keys: ['phMin', 'phMax', 'ipMin', 'ipMax'], width: 120 }] },
    { title: 'Override Requirements', when: (st, ctx) => ctx.hasOverrideFields(st), rows: [
      { keys: ['overridePhMin', 'overridePhMax', 'overrideIpMin', 'overrideIpMax'], width: 120 },
      { keys: ['overrideNote'], width: null },
    ] },
    { title: 'Actuals', rows: [{ keys: ['actualPhMin', 'actualPhMax', 'actualIpMin', 'actualIpMax'], width: 120 }] },
  ] },
  { sections: [
    { when: (_st, ctx) => ctx.job.nInd === '1', rows: [{ keys: ['weldPosition'], width: 200 }] },
  ] },
  { sections: [
    { when: st => st.id === 'root-weld', rows: [{ keys: ['performed5x'], width: 400 }] },
    { rows: [{ keys: ['comments'], width: null }] },
  ] },
];

@Component({
  selector: 'app-signoff-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideBadgeCheck, LucideCheck, LucideLockOpen, LucideChevronRight, LucideChevronDown, PersonSearchInputComponent],
  templateUrl: './signoff-panel.component.html'
})
export class SignoffPanelComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
  stageIndex = input.required<number>();

  weldGroups = WELD_GROUPS;

  /* Records Review's embedded Signoff History: collapsed by default, same expand-per-row and
     Expand/Collapse all pattern as the History screen, indexed by position in signoffRecords() */
  expandedRecords = signal<ReadonlySet<number>>(new Set());
  toggleRecord(i: number) {
    this.expandedRecords.update(s => {
      const next = new Set(s);
      if (!next.delete(i)) next.add(i);
      return next;
    });
  }
  allRecordsExpanded(records: { fields: unknown[] }[]): boolean {
    const keys = records.map((r, i) => r.fields.length ? i : -1).filter(i => i >= 0);
    return keys.length > 0 && keys.every(i => this.expandedRecords().has(i));
  }
  toggleAllRecords(records: { fields: unknown[] }[]) {
    const keys = records.map((r, i) => r.fields.length ? i : -1).filter(i => i >= 0);
    this.expandedRecords.set(this.allRecordsExpanded(records) ? new Set() : new Set(keys));
  }

  /* the two joint members a weld build-up can affect, with their MCL, MIC (fabricationData key)
     and MIC-verified keys */
  affectedItemSlots = [
    { key: 'joiningItem', mcl: 'mcl1', mic: 'id1', micLabel: 'MIC 1', micVerified: 'micVerified1' },
    { key: 'joinToItem', mcl: 'mcl2', mic: 'id2', micLabel: 'MIC 2', micVerified: 'micVerified2' },
  ] as const;

  isAffected(key: string): boolean {
    return (this.stage().inputs['affectedItems'] as string | undefined)?.includes(key) ?? false;
  }

  /* MIC 1/MIC 2 (fabricationData id1/id2) only show for a joint member whose MCL requires
     traceability per the admin MCL Traceability table (mcl-traceability.ts) */
  micRequired(mclValue: string): boolean {
    return requiresTraceability(mclValue);
  }

  micValue(mic: string): string {
    return this.ctx().wf().fabricationData[mic] ?? '';
  }

  /* Single source of truth for "is this the Fit stage routed as Weld Build-up" -- Weld Build-up
     gets its fields/layout from WELD_GROUPS (like Tack) instead of Fit's own signoff-field
     rendering below, so every fit-specific block in the template must agree on this same check.
     Comments/Defer Tack duplicating from the generic signoff-fields renderer (2026-09-23) happened
     because each block re-wrote the id/routingType check inline and one of them didn't match. */
  readonly hasDecision = hasDecision;

  /* an inspection stage with one possible Type has it locked in; says why, so the disabled
     droplist isn't left unexplained */
  typeLockNote(st: WorkflowStage): string {
    if (!(st.role ?? '').includes('Inspector') || st.routingOptions?.length !== 1) return '';
    if (st.id.startsWith('layer-ndt-')) return `Set by NDT Each (${this.ctx().job.ndtEach})`;
    if (isExcavationNdtStageId(st.id)) return 'Same inspection that rejected the joint';
    return '';
  }

  isFitBuildup(st: WorkflowStage): boolean {
    return st.id === 'fit' && st.routingType === 'weld-buildup';
  }

  /* Fit stage's Consumable Insert MIC / Backing Ring MIC (joint-wide, not per-item like the
     Weld Build-up MIC verified checkboxes above) are only required when either joint member's
     MCL requires traceability */
  micSignoffRequired(): boolean {
    const job = this.ctx().job;
    return requiresTraceability(job.mcl1) || requiresTraceability(job.mcl2);
  }

  groupVisible(g: WeldGroup): boolean {
    return g.sections.some(sec => this.sectionVisible(sec) && sec.rows.some(r => this.rowFields(r).length > 0));
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
    return READONLY_LIMIT_KEYS.has(f.key);
  }

  isLocked(f: StageField): boolean {
    return isFieldLocked(this.stage(), f);
  }

  isActual(f: StageField): boolean {
    return f.key in ACTUAL_REQUIREMENT;
  }

  /* strips anything but digits as the user types/pastes (Actual PH/IP only — whole numbers, no
     minus, decimal or scientific notation, unlike a native number input) */
  digitsOnly(input: HTMLInputElement) {
    const clean = input.value.replace(/[^0-9]/g, '');
    if (clean !== input.value) input.value = clean;
  }

  /* A native select shows the chosen option's text when closed, so selects whose options carry
     details (GWP/WTN descriptions) hide that text and overlay just the chosen code instead. */
  hasDetails(f: StageField) {
    return !!f.options?.some(o => o.detail);
  }
  selectedLabel(f: StageField) {
    return f.options?.find(o => o.value === this.stage().inputs[f.key])?.label ?? '';
  }

  onSelect(f: StageField, value: string | null) {
    if (f.key === 'performed5x') this.ctx().on5xChange(this.stage(), value ?? '');
    else this.ctx().stageSelectChange(this.stage(), f, value);
  }
}
