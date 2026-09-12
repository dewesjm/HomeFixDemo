//This is the job details page, lot of stuff in here

import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmService } from '../shared/confirm.service';
import { TooltipDirective } from '../shared/tooltip.directive';
import { SyncStatusComponent } from '../sync-status/sync-status.component';
import {
  LucideArrowLeft, LucideWorkflow, LucideInfo, LucideBox, LucideTrash2, LucidePlus,
  LucideBadgeCheck, LucideCircleCheck, LucideLockOpen, LucidePaperclip, LucideFile,
  LucideChevronDown, LucideChevronUp
} from '@lucide/angular';

import { JOBS, Job } from '../data/jobs';
import { characteristicLabel } from '../data/characteristics';
import { CONDITION_OPTIONS } from '../data/conditions';
import { WorkflowService } from '../services/workflow.service';
import {
  WorkflowStage, StageField, SignoffField, StageResult, STAGE_RESULT_OPTIONS, WorkType, WORK_TYPE_OPTIONS,
  isStageLocked, currentStepLabel, activeStageId, allRequiredSigned, getTemplates, FABRICATION_FIELDS,
  getShops
} from '../data/workflow';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TooltipDirective, SyncStatusComponent,
    LucideArrowLeft, LucideWorkflow, LucideInfo, LucideBox, LucideTrash2, LucidePlus,
    LucideBadgeCheck, LucideCircleCheck, LucideLockOpen, LucidePaperclip, LucideFile,
    LucideChevronDown, LucideChevronUp
  ],
  templateUrl: './job-detail.component.html'
})
export class JobDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wfService = inject(WorkflowService);
  private confirm = inject(ConfirmService);

  job: Job | undefined = JOBS.find(j => j.id === Number(this.route.snapshot.paramMap.get('id')));
  wf = this.job ? this.wfService.workflowFor(this.job) : null;

  /* new-component form model */
  newName = signal('');
  newPart = signal('');
  newQty = signal(1);

  /* audit/records tier: collapsed by default, toggled by the Show more/less button */
  showAudit = signal(false);

  resultOptions = STAGE_RESULT_OPTIONS;
  workTypeOptions = WORK_TYPE_OPTIONS;
  conditionOptions = CONDITION_OPTIONS;

  /* steps model: only show stages that are signed, required, or the current active stage */
  stepsModel = computed<{ label: string; disabled: boolean; stageIndex: number }[]>(() => {
    if (!this.wf) return [];
    const stages = this.wf().stages;
    const activeIdx = stages.findIndex(s => !s.signed);
    return stages
      .map((s, i) => ({ label: s.displayName || s.label, disabled: this.locked(i), signed: s.signed, required: s.required, stageIndex: i }))
      .filter(s => s.signed || s.required || s.stageIndex === activeIdx)
      .map(s => ({ label: s.label, disabled: s.disabled, stageIndex: s.stageIndex }));
  });
  /* which stage's sign-off shows; defaults to active */
  selectedStep = signal<number>(this.initialStep());
  /* inline field validation errors: key = `${stageId}:${fieldKey}` */
  fieldErrors = signal<Record<string, string>>({});

  activeStepLabel = computed(() => {
    const steps = this.stepsModel();
    const idx = this.selectedStep();
    const match = steps.find(s => s.stageIndex === idx);
    return match?.label ?? '';
  });

  currentStep = computed(() => (this.wf ? currentStepLabel(this.wf().stages) : ''));
  /* done when all required stages signed */
  jobComplete = computed(() => (this.wf ? allRequiredSigned(this.wf().stages) : false));
  /* fabrication fields locked after fit-up inspection signed */
  fabLocked = computed(() => {
    if (!this.wf) return false;
    return this.wf().stages.some(s => s.id === 'fitup-insp' && s.signed);
  });
  /* id of stage awaiting sign-off, null when done */
  activeStage = computed(() => (this.wf ? activeStageId(this.wf().stages) : null));
  /* index of stage awaiting sign-off */
  activeIndex = computed(() => this.indexOfActive());
  rejectedCount = computed(() =>
    this.wf ? this.wf().stages.filter(s => s.signed && s.result === 'unsat').length : 0);
  history = computed(() => (this.wf ? [...this.wf().history].reverse() : []));

  defaultStepOption(stage: WorkflowStage): string {
    if (!stage.stepOptions?.length) return '';
    return stage.stepOptions.find(o => o.default)?.value ?? stage.stepOptions[0].value;
  }

  /* fabrication cross-stage fields (Welding) — rebuilt each read so Location options stay fresh */
  fabFields = computed(() => FABRICATION_FIELDS.map(f =>
    f.key === 'location'
      ? { ...f, options: getShops().map(s => ({ label: s, value: s.toLowerCase().replace(/\s+/g, '-') })) }
      : f
  ));
  isNdtStage = computed(() => {
    if (!this.wf) return false;
    const stage = this.wf().stages[this.selectedStep()];
    return stage?.id?.startsWith('root-ndt') || stage?.id?.startsWith('layer-ndt') || stage?.id?.startsWith('final-ndt');
  });

//extra fields when you press show more
  private readonly COST_CENTERS = ['CC-4100 Field Ops', 'CC-4205 Maintenance', 'CC-4310 Inspections'];
  auditFields = computed<{ label: string; value: string }[]>(() => {
    const j = this.job;
    if (!j) return [];
    const sched = new Date(j.scheduledFor).getTime();
    const fmt = (msOffset: number) =>
      new Date(sched + msOffset).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const DAY = 86_400_000;
    return [
      // Real fields the work view doesn't surface
      { label: 'Project number', value: j.jobNumber },
      { label: 'Record ID', value: String(j.id) },
      // Demo records/audit metadata
      { label: 'Reference document #', value: `45${String(j.id).padStart(8, '0')}` },
      { label: 'Department', value: this.COST_CENTERS[j.id % this.COST_CENTERS.length] },
      { label: 'Created by', value: 'Dispatch (auto)' },
      { label: 'Created on', value: fmt(-7 * DAY) },
      { label: 'Last changed', value: fmt(-1 * DAY) },
      // Placeholder records/finance metadata
      { label: 'Purchase order #', value: `PO-${String(j.id).padStart(6, '0')}` },
      { label: 'Invoice #', value: `INV-${1000 + j.id}` },
      { label: 'GL account', value: '60200 · Repairs & maintenance' },
      { label: 'Approval status', value: 'Approved' },
      { label: 'Source system', value: 'SAP PM' },
      { label: 'External ref #', value: `EXT-${String(j.id).padStart(7, '0')}` },
      { label: 'Record version', value: 'v3' },
    ];
  });

  /* deterministic placeholder values, varied per job so the demo doesn't look templated */
  demo = computed(() => {
    const j = this.job;
    if (!j) return null;
    const id = j.id;
    const pick = (arr: string[], salt: number) => arr[(id * salt) % arr.length];
    return {
      // Job details
      priority:        pick(['Normal', 'High', 'Low', 'Urgent'], 7),
      workOrderType:   pick(['Corrective', 'Preventive', 'Inspection', 'Emergency'], 3),
      customer:        pick(['Acme Property Mgmt', 'Riverside HOA', 'Lakeview Apartments', 'Summit Facilities', 'Oakwood Realty'], 5),
      customerPhone:   `(555) 0${10 + (id % 89)}-${String(1000 + (id * 37) % 9000)}`,
      serviceAddress:  `${100 + (id * 13) % 9899} ${pick(['Maple Ave', 'Oak St', 'Cedar Ln', 'Pine Rd', 'Elm Blvd'], 11)}, ${pick(['Springfield', 'Riverton', 'Fairview', 'Madison', 'Clinton'], 17)}`,
      region:          `${pick(['Midwest', 'Northeast', 'South', 'West', 'Mountain'], 19)} · Branch ${1 + (id % 24)}`,
      warranty:        pick(['In warranty', 'Out of warranty', 'Extended'], 23),
      paymentTerms:    pick(['Net 30', 'Net 15', 'Net 60', 'Due on receipt'], 29),
      // Work validation
      laborHours:      (1 + (id * 7) % 80 / 10).toFixed(1),
      warrantyPeriod:  pick(['30 days', '90 days', '1 year', '2 years'], 31),
      disposalMethod:  pick(['Recycled', 'Landfill', 'Returned to vendor', 'Hazmat'], 37),
      followUp:        pick(['No', 'Yes'], 41),
      // Sign-off
      permitVerified:  pick(['Yes', 'N/A', 'Pending'], 43),
      testMethod:      pick(['Visual + functional', 'Pressure test', 'Meter reading', 'Load test'], 47),
      crewSize:        String(1 + (id % 4)),
      safetyCheck:     pick(['Passed', 'Passed w/ notes', 'N/A'], 53),
      reworkNeeded:    pick(['No', 'Yes'], 59),
      customerSignature: pick(['On file', 'Verbal', 'Pending'], 61),
    };
  });

  /* first unsigned required stage, or last when done */
  private indexOfActive(): number {
    if (!this.wf) return 0;
    const stages = this.wf().stages;
    const idx = stages.findIndex(s => s.required && !s.signed);
    return idx === -1 ? Math.max(0, stages.length - 1) : idx;
  }
  private initialStep(): number { return this.indexOfActive(); }

  // ---- stage display helpers ----
  /* locked until prior required stages signed */
  locked(i: number): boolean {
    return this.wf ? isStageLocked(this.wf().stages, i) : true;
  }
  /* sign-off editable only on the active stage */
  editable(stage: WorkflowStage): boolean {
    return stage.required && !stage.signed && stage.id === this.activeStage();
  }
  /* inputs editable on active or unlocked optional stage */
  inputsEditable(stage: WorkflowStage, i: number): boolean {
    return !stage.signed && !this.locked(i);
  }
  /* only the last signed stage can reopen */
  canReopen(stage: WorkflowStage, i: number): boolean {
    if (!stage.signed || !this.wf) return false;
    return !this.wf().stages.slice(i + 1).some(s => s.required && s.signed);
  }
  canSignStage(stage: WorkflowStage): boolean {
    if (!this.editable(stage)) return false;
    // Non-inspection steps auto-accept (SAT)
    if (!stage.rejectToStage && !stage.result) {
      this.setStageResult(stage, 'sat' as StageResult);
    }
    if (!stage.result) return false;
    if (stage.repeatable && !stage.stepType) return false;
    // Fit: fabrication data must have MIC 1, MIC 2, Drawing Rev, Actual Thickness
    if (stage.id === 'fit' && this.wf) {
      const fab = this.wf().fabricationData;
      const required = ['id1', 'id2', 'drawingRev', 'actualThickness'];
      if (!required.every(k => fab[k]?.trim())) return false;
    }
    // Fit-Up Insp: all verification checkboxes must be checked
    if (stage.id === 'fitup-insp') {
      const allVerified = stage.fields.every(f => f.type === 'checkbox' && stage.inputs[f.key] === 'yes');
      if (!allVerified) return false;
    }
    return stage.signoffFields
      .filter(f => f.required)
      .every(f => {
        const val = stage.signoffInputs[f.key] ?? '';
        return val.trim().length > 0;
      });
  }

  updateStepType(stage: WorkflowStage, value: string) {
    if (!this.job || !this.wf) return;
    const templates = getTemplates()[this.job.trade] ?? [];
    /* Fit stage: swap fields when switching between Fit and Weld Build up */
    if (stage.id === 'fit') {
      const fitTpl = templates.find(t => t.id === 'fit');
      const tackTpl = templates.find(t => t.id === 'tack');
      const newFields = value === 'weld-buildup' && tackTpl
        ? [...tackTpl.fields.map(f => ({ ...f })), { key: 'affectedItem', label: 'Affected Item', type: 'text' as const, required: true }]
        : (fitTpl?.fields ?? []).map(f => ({ ...f }));
      const newSignoff = value === 'weld-buildup'
        ? []
        : (fitTpl?.signoffFields ?? []).map(f => ({ ...f }));
      this.wf.update(wf => ({
        ...wf,
        stages: wf.stages.map(s => s.id === stage.id ? {
          ...s, stepType: value, fields: newFields, signoffInputs: {}, signoffFields: newSignoff
        } : s)
      }));
      return;
    }
    this.wf.update(wf => ({
      ...wf,
      stages: wf.stages.map(s => s.id === stage.id ? { ...s, stepType: value } : s)
    }));
  }

  swapStageOptions(stage: WorkflowStage): { label: string; value: string }[] {
    if (!this.job) return [];
    const templates = getTemplates()[this.job.trade] ?? [];
    const currentSwap = stage.swapStageId || stage.id;
    return templates
      .filter(t => t.id !== 'prep' && t.id !== 'handover')
      .map(t => ({ label: t.label, value: t.id }));
  }
  updateSwapStage(stage: WorkflowStage, swapId: string) {
    if (!this.job || !this.wf) return;
    const currentStep = this.selectedStep();
    const templates = getTemplates()[this.job.trade] ?? [];
    const swapTpl = templates.find(t => t.id === swapId);
    if (!swapTpl) return;
    const sf = swapTpl.signoffFields ?? [];
    this.wf.update(wf => ({
      ...wf,
      stages: wf.stages.map(s => s.id === stage.id ? {
        ...s,
        swapStageId: swapId,
        fields: swapTpl.fields.map(f => ({ ...f })),
        signoffFields: sf.map(f => ({ ...f })),
      } : s)
    }));
    // Ensure the step selection doesn't shift during re-render
    this.selectedStep.set(currentStep);
  }

  // ---- stage inputs ----
  /* fields with no showIf always show; conditional ones show when their trigger matches */
  visibleFields(stage: WorkflowStage): StageField[] {
    return stage.fields.filter(f => {
      if (f.showIf) {
        const checkVal = f.showIf.key === 'inspectionType' ? stage.inspectionType : stage.inputs[f.showIf.key];
        if (checkVal !== f.showIf.equals) return false;
      }
      return true;
    });
  }

  /* map fitup-insp verification field keys to fabrication data keys */
  private readonly FAB_VERIFY_MAP: Record<string, string> = {
    verifyMic1: 'id1', verifyMic2: 'id2', verifyDrawingRev: 'drawingRev',
    verifyActualThickness: 'actualThickness', verifyRevisedJointDesign: 'revisedJointDesign',
  };
  getFabValue(fieldKey: string): string {
    const fabKey = this.FAB_VERIFY_MAP[fieldKey];
    if (!fabKey || !this.wf) return '';
    const val = this.wf().fabricationData[fabKey] ?? '';
    if (!val) return '';
    // Resolve select field labels
    const fabField = FABRICATION_FIELDS.find(f => f.key === fabKey);
    if (fabField?.type === 'select' && fabField.options) {
      const match = fabField.options.find(o => o.value === val);
      return match?.label ?? val;
    }
    return val;
  }
  /* a trigger field that other fields declare a showIf against — always breaks
     onto its own row (even before a selection) so its dependent fields can flow
     to the right of it once they appear */
  startsGroup(stage: WorkflowStage, field: StageField): boolean {
    return stage.fields.some(f => f.showIf?.key === field.key);
  }
  /* blank any dependent field whose trigger no longer matches, so hidden fields don't keep stale values */
  private clearHidden(stage: WorkflowStage) {
    if (!this.job) return;
    for (const f of stage.fields) {
      if (f.showIf && stage.inputs[f.showIf.key] !== f.showIf.equals && stage.inputs[f.key])
        this.wfService.setStageInput(this.job, stage.id, f, '');
    }
  }

  /* Consumable Insert: when Yes, auto-populate filler fields from fit stage consumable data and lock them */
  onConsumableInsertChange(stage: WorkflowStage, value: string) {
    if (!this.job || !this.wf) return;
    const field = stage.fields.find(f => f.key === 'consumableInsertOnly');
    if (field) this.wfService.setStageInput(this.job, stage.id, field, value);
    if (value !== 'yes') {
      /* clearing: unlock filler fields (they'll revert to normal editable) */
      return;
    }
    /* find the fit stage's consumable signoff data */
    const fitStage = this.wf().stages.find(s => s.id === 'fit');
    if (!fitStage) return;
    const consumableType = fitStage.signoffInputs['consumableType'] ?? '';
    const consumableSize = fitStage.signoffInputs['consumableSize'] ?? '';
    const consumableId = fitStage.signoffInputs['consumableId'] ?? '';
    /* auto-populate filler fields */
    const fillerType = stage.fields.find(f => f.key === 'fillerMetalType');
    const fillerSize = stage.fields.find(f => f.key === 'fillerMetalSize');
    const fillerMic = stage.fields.find(f => f.key === 'fillerMetalMic');
    if (fillerType && consumableType) this.wfService.setStageInput(this.job, stage.id, fillerType, consumableType);
    if (fillerSize && consumableSize) this.wfService.setStageInput(this.job, stage.id, fillerSize, consumableSize);
    if (fillerMic && consumableId) this.wfService.setStageInput(this.job, stage.id, fillerMic, consumableId);
  }

  /* 5X inspection dropdown: when Yes, auto-sign the corresponding 5X NDT stage */
  on5xChange(stage: WorkflowStage, value: string) {
    if (!this.job || !this.wf) return;
    /* save the value to the stage input */
    const field = stage.fields.find(f => f.key === 'performed5x');
    if (field) this.wfService.setStageInput(this.job, stage.id, field, value);
    if (value !== 'yes') return;
    /* determine which 5X stage to auto-sign based on parent stage */
    const ndt5xId = stage.id === 'root-weld' ? 'root-ndt-vt5x'
      : stage.id === 'final-weld' ? 'final-ndt-vt5x' : '';
    if (!ndt5xId) return;
    const ndtStage = this.wf().stages.find(s => s.id === ndt5xId);
    if (!ndtStage || ndtStage.signed) return;
    /* auto-sign the 5X stage */
    this.wfService.signStage(this.job, ndt5xId);
  }

  stageInputBlur(stage: WorkflowStage, field: StageField, value: string) {
    if (this.job && value !== (stage.inputs[field.key] ?? '')) {
      this.wfService.setStageInput(this.job, stage.id, field, value);
      this.clearHidden(stage);
    }
    this.onFieldBlur(stage, field);
    /* clear required error if now filled */
    if (field.required && value) {
      const key = `${stage.id}:${field.key}`;
      const prev = this.fieldErrors();
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        this.fieldErrors.set(next);
      }
    }
  }
  /* WTN → Weld Process mapping */
  private readonly WTN_PROCESS_MAP: Record<string, string> = {
    'wtn-101': 'smaw', 'wtn-102': 'gtaw', 'wtn-103': 'gmaw', 'wtn-201': 'fcaw'
  };
  /* WTN → PH/IP requirements mapping */
  private readonly WTN_PHIP_MAP: Record<string, { phMin: string; phMax: string; ipMin: string; ipMax: string }> = {
    'wtn-101': { phMin: '3.2', phMax: '6.4', ipMin: '1.6', ipMax: '4.8' },
    'wtn-102': { phMin: '2.8', phMax: '5.8', ipMin: '1.4', ipMax: '4.2' },
    'wtn-103': { phMin: '3.0', phMax: '6.0', ipMin: '1.5', ipMax: '4.5' },
    'wtn-201': { phMin: '3.5', phMax: '7.0', ipMin: '1.8', ipMax: '5.0' },
  };

  /* select fields commit on change, clear maps to '' */
  stageSelectChange(stage: WorkflowStage, field: StageField, value: string | null) {
    const v = value ?? '';
    if (this.job && v !== (stage.inputs[field.key] ?? '')) {
      this.wfService.setStageInput(this.job, stage.id, field, v);
      this.clearHidden(stage);
      /* Auto-set Weld Process when WTN changes */
      if (field.key === 'wtn' && this.WTN_PROCESS_MAP[v]) {
        const weldProcessField = stage.fields.find(f => f.key === 'weldProcess');
        if (weldProcessField) {
          this.wfService.setStageInput(this.job, stage.id, weldProcessField, this.WTN_PROCESS_MAP[v]);
          /* clear weld process error */
          const wpKey = `${stage.id}:weldProcess`;
          const prev = this.fieldErrors();
          if (prev[wpKey]) {
            const next = { ...prev };
            delete next[wpKey];
            this.fieldErrors.set(next);
          }
        }
      }
      /* Auto-set PH/IP requirements when WTN changes */
      if (field.key === 'wtn' && this.WTN_PHIP_MAP[v]) {
        const phip = this.WTN_PHIP_MAP[v];
        for (const [k, val] of Object.entries(phip)) {
          const f = stage.fields.find(ff => ff.key === k);
          if (f) this.wfService.setStageInput(this.job, stage.id, f, val);
        }
      }
    }
    /* clear validation error for this field */
    const key = `${stage.id}:${field.key}`;
    const prev = this.fieldErrors();
    if (prev[key]) {
      const next = { ...prev };
      delete next[key];
      this.fieldErrors.set(next);
    }
  }

  // ---- per-stage sign-off ----
  private show(v: string | null | undefined): string { return v && v.length ? v : '—'; }

  setStageResult(stage: WorkflowStage, result: StageResult) {
    if (!this.job || result === stage.result) return;
    const old = stage.result;
    this.wfService.updateStageSignoff(this.job, stage.id, { result },
      { action: `${stage.label} — Decision`, from: old ? old.toUpperCase() : '—', to: result.toUpperCase() });
  }

  /* generic signoff field blur handler */
  blurSignoffField(stage: WorkflowStage, field: SignoffField, value: string) {
    if (!this.job) return;
    const prev = stage.signoffInputs[field.key] ?? '';
    if (value === prev) return;
    this.wfService.updateStageSignoff(this.job, stage.id,
      { signoffInputs: { ...stage.signoffInputs, [field.key]: value } },
      { action: `${stage.label} — ${field.label}`, from: this.show(prev), to: this.show(value) });
  }

  /* generic signoff field select change handler */
  signoffSelectChange(stage: WorkflowStage, field: SignoffField, value: string | null) {
    const v = value ?? '';
    if (!this.job) return;
    const prev = stage.signoffInputs[field.key] ?? '';
    if (v === prev) return;
    this.wfService.updateStageSignoff(this.job, stage.id,
      { signoffInputs: { ...stage.signoffInputs, [field.key]: v } },
      { action: `${stage.label} — ${field.label}`, from: this.show(prev), to: this.show(v) });
  }

  /* generic signoff checkbox change handler */
  signoffCheckboxChange(stage: WorkflowStage, field: SignoffField, checked: boolean) {
    const v = checked ? 'yes' : '';
    if (!this.job) return;
    const prev = stage.signoffInputs[field.key] ?? '';
    if (v === prev) return;
    this.wfService.updateStageSignoff(this.job, stage.id,
      { signoffInputs: { ...stage.signoffInputs, [field.key]: v } },
      { action: `${stage.label} — ${field.label}`, from: this.show(prev), to: this.show(v) });
  }

  /* visibility of a signoff field (showIf support) */
  visibleSignoffFields(stage: WorkflowStage): SignoffField[] {
    return stage.signoffFields.filter(f =>
      !f.showIf || stage.signoffInputs[f.showIf.key] === f.showIf.equals);
  }
  /* ── inline field validation ── */
  private validateStageFields(stage: WorkflowStage): Record<string, string> {
    const errors: Record<string, string> = {};
    const fields = stage.fields ?? [];
    const nInd = this.job?.nInd;
    for (const f of fields) {
      if (f.key === 'comments') continue;
      const val = stage.inputs?.[f.key];
      const empty = val === undefined || val === null || val === '';
      /* weldPosition required only when N Ind. is 1 */
      const isRequired = f.key === 'weldPosition' ? nInd === '1' : f.required;
      if (isRequired && empty) {
        errors[`${stage.id}:${f.key}`] = `${f.label} is required`;
      }
      if (!empty && f.type === 'number' && (f.minField || f.maxField)) {
        const num = Number(val);
        const minVal = f.minField ? Number(stage.inputs?.[f.minField]) : NaN;
        const maxVal = f.maxField ? Number(stage.inputs?.[f.maxField]) : NaN;
        const belowMin = !isNaN(minVal) && num < minVal;
        const aboveMax = !isNaN(maxVal) && num > maxVal;
        if (belowMin || aboveMax) {
          const label = f.key === 'actualPh' ? 'Actual PH' : 'Actual IP';
          errors[`${stage.id}:${f.key}`] = `${label} Out of Range`;
        }
      }
    }
    return errors;
  }

  /** Called on blur of a single field — validates required + range */
  onFieldBlur(stage: WorkflowStage, field: StageField) {
    const key = `${stage.id}:${field.key}`;
    /* read current values from live signal (stage param may be stale) */
    const curStage = this.wf ? this.wf().stages.find(s => s.id === stage.id) : undefined;
    const val = curStage?.inputs?.[field.key];
    const empty = val === undefined || val === null || val === '';
    const prev = { ...this.fieldErrors() };
    delete prev[key];
    /* required check on blur */
    const nInd = this.job?.nInd;
    const isRequired = field.key === 'weldPosition' ? nInd === '1' : field.required;
    if (isRequired && empty) {
      prev[key] = `${field.label} is required`;
    }
    /* range check */
    if (!empty && field.type === 'number' && (field.minField || field.maxField)) {
      const num = Number(val);
      const minVal = field.minField ? Number(curStage?.inputs?.[field.minField]) : NaN;
      const maxVal = field.maxField ? Number(curStage?.inputs?.[field.maxField]) : NaN;
      const belowMin = !isNaN(minVal) && num < minVal;
      const aboveMax = !isNaN(maxVal) && num > maxVal;
      if (belowMin || aboveMax) {
        const label = field.key === 'actualPh' ? 'Actual PH' : 'Actual IP';
        prev[key] = `${label} Out of Range`;
      }
    }
    this.fieldErrors.set(prev);
  }

  fieldError(stageId: string, fieldKey: string): string | undefined {
    return this.fieldErrors()[`${stageId}:${fieldKey}`];
  }

  signStage(stage: WorkflowStage) {
    if (!this.job) return;
    /* validate required fields + range constraints */
    const errors = this.validateStageFields(stage);
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) return;
    if (!this.canSignStage(stage)) return;
    /* Interim Layer: sign and insert a fresh layer copy, stay on layer */
    if (stage.id === 'root-layer' && stage.stepType === 'interim') {
      this.confirm.confirm({
        header: 'Confirm sign-off',
        message: 'By signing, I certify that all recorded values are accurate and the work has been performed in accordance with applicable standards.',
        acceptLabel: 'Signoff',
        rejectLabel: 'Cancel',
        password: true,
        accept: () => {
          this.wfService.signStage(this.job!, stage.id);
          /* insert a fresh layer copy after this one */
          if (this.wf) {
            const wf = this.wf();
            const idx = wf.stages.findIndex(s => s.id === stage.id);
            const fresh: WorkflowStage = {
              ...stage,
              id: `root-layer-${Date.now()}`,
              signed: false,
              signedAt: null,
              result: null,
              inputs: {},
              signoffInputs: {},
              stepType: 'standard',
              routeTo: '',
            };
            this.wf.update(w => ({
              ...w,
              stages: [...w.stages.slice(0, idx + 1), fresh, ...w.stages.slice(idx + 1)]
            }));
            this.selectedStep.set(idx + 1);
          }
        }
      });
      return;
    }
    const decision = (stage.result ?? '').toUpperCase();
    const stepNote = stage.repeatable && stage.stepType === 'repeat'
      ? ' Another round will be added after this one.'
      : '';
    this.confirm.confirm({
      header: 'Confirm sign-off',
      message: `By signing, I certify that all recorded values are accurate and the work has been performed in accordance with applicable standards.${stepNote}`,
      acceptLabel: 'Signoff',
      rejectLabel: 'Cancel',
      password: true,
      accept: () => {
        this.wfService.signStage(this.job!, stage.id);
        this.router.navigate(['/table']);
      }
    });
  }
  reopenStage(stage: WorkflowStage) {
    if (!this.job) return;
    this.wfService.reopenStage(this.job, stage.id);
    const idx = this.wf!().stages.findIndex(s => s.id === stage.id);
    if (idx >= 0) this.selectedStep.set(idx);
  }

  // ---- attachments ----
  addAttachments(event: Event) {
    if (!this.job) return;
    const input = event.target as HTMLInputElement;
    for (const f of Array.from(input.files ?? [])) this.wfService.addAttachment(this.job, f.name);
    input.value = '';   // reset so the same file can be picked again
  }
  removeAttachment(id: string) {
    if (this.job) this.wfService.removeAttachment(this.job, id);
  }

  // ---- cross-stage work validation ----
  addComponent() {
    const name = this.newName().trim();
    if (!name || !this.job) return;
    this.wfService.addComponent(this.job, name, this.newPart().trim(), this.newQty() || 1);
    this.newName.set('');
    this.newPart.set('');
    this.newQty.set(1);
  }
  removeComponent(id: string) {
    if (this.job) this.wfService.removeComponent(this.job, id);
  }
  blurValidationNotes(value: string) {
    const old = this.wf!().validationNotes;
    if (this.job && value !== old) this.wfService.setValidationNotes(this.job, value);
  }
  setWorkType(workType: WorkType | null) {
    if (this.job && workType !== this.wf!().workType) this.wfService.setWorkType(this.job, workType);
  }
  setConditionCode(conditionCode: string) {
    if (this.job && (conditionCode ?? '') !== this.wf!().conditionCode) this.wfService.setConditionCode(this.job, conditionCode ?? '');
  }
  setConditionCount(value: string | number) {
    const count = Math.max(0, Math.floor(Number(value) || 0));
    if (this.job && count !== this.wf!().conditionCount) this.wfService.setConditionCount(this.job, count);
  }

  /* code description, shown on hover */
  codeLabel(code: string): string { return characteristicLabel(code); }

  /* fabrication data input handlers */
  fabInputBlur(key: string, value: string) {
    if (this.job && this.wf && value !== (this.wf().fabricationData[key] ?? '')) {
      this.wfService.setFabricationData(this.job, key, value);
    }
  }
  fabSelectChange(key: string, value: string | null) {
    const v = value ?? '';
    if (this.job && this.wf && v !== (this.wf().fabricationData[key] ?? '')) {
      this.wfService.setFabricationData(this.job, key, v);
    }
  }

  /* step option / inspection type handlers */
  setInspectionType(value: string) {
    if (!this.job || !this.wf) return;
    const idx = this.selectedStep();
    const stage = this.wf().stages[idx];
    if (!stage) return;
    this.wf.update(wf => ({
      ...wf,
      stages: wf.stages.map((s, i) => i === idx ? { ...s, inspectionType: value } : s)
    }));
  }

  back() {
    this.router.navigate(['/table']);
  }
}
