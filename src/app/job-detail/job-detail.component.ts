//This is the job details page, lot of stuff in here

import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmService } from '../shared/confirm.service';
import { SyncStatusComponent } from '../sync-status/sync-status.component';
import { RoutingBarComponent } from '../routing-bar/routing-bar.component';
import { JointDetailsComponent } from '../joint-details/joint-details.component';
import { AttachmentsComponent } from '../attachments/attachments.component';
import { FabricationComponent } from '../fabrication/fabrication.component';
import { SignoffPanelComponent, SignoffContext } from '../signoff-panel/signoff-panel.component';

import { JOBS, Job } from '../data/jobs';
import { characteristicLabel } from '../data/characteristics';

import { getJointDesign, jointDesignOptions } from '../data/joint-designs';
import { WorkflowService } from '../services/workflow.service';
import {
  WorkflowStage, StageField, SignoffField, StageResult, STAGE_RESULT_OPTIONS, WorkType, WORK_TYPE_OPTIONS,
  isStageLocked, currentStepLabel, activeStageId, allRequiredSigned, getTemplates, FABRICATION_FIELDS, FabricationField,
  getShops
} from '../data/workflow';
import { requiresTraceability } from '../data/mcl-traceability';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, SyncStatusComponent, RoutingBarComponent, JointDetailsComponent, AttachmentsComponent, FabricationComponent, SignoffPanelComponent
  ],
  templateUrl: './job-detail.component.html'
})
export class JobDetailComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wfService = inject(WorkflowService);
  private confirm = inject(ConfirmService);

  job: Job | undefined = JOBS.find(j => j.id === this.route.snapshot.paramMap.get('id'));
  wf = this.job ? this.wfService.workflowFor(this.job) : null;

  /* Reset fit stage stepType + inputs on navigation so it reverts to default */
  ngOnDestroy() {
    if (!this.job || !this.wf) return;
    const templates = getTemplates()[this.job.trade] ?? [];
    const fitTpl = templates.find(t => t.id === 'fit');
    this.wf.update(wf => ({
      ...wf,
      stages: wf.stages.map(s => {
        if (s.id !== 'fit') return s;
        if (s.stepType === 'fit') return s;
        return {
          ...s,
          stepType: 'fit',
          fields: (fitTpl?.fields ?? []).map(f => ({ ...f })),
          signoffFields: (fitTpl?.signoffFields ?? []).map(f => ({ ...f })),
          inputs: {},
          signoffInputs: {},
        };
      })
    }));
  }

  /* new-component form model */
  newName = signal('');
  newPart = signal('');
  newQty = signal(1);

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
  /* index of the last stage the user modified inputs/signoff on */
  lastModifiedStageIdx = signal<number>(-1);
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
  soldSigned = computed(() => {
    if (!this.wf) return false;
    return this.wf().stages.some(s => s.id === 'sold' && s.signed);
  });
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

  signoffRecords = computed(() => {
    if (!this.wf) return [];
    const all: { stageLabel: string; fields: { key: string; label: string; value: string }[]; result: string | null; who: string; when: string; action: 'signed' | 'reopened' }[] = [];
    for (const s of this.wf().stages) {
      for (const r of s.signoffRecords) all.push(r);
    }
    return all.sort((a, b) => a.when.localeCompare(b.when));
  });

  defaultStepOption(stage: WorkflowStage): string {
    if (!stage.stepOptions?.length) return '';
    return stage.stepOptions.find(o => o.default)?.value ?? stage.stepOptions[0].value;
  }

  signoffCtx = computed<SignoffContext | null>(() => {
    if (!this.job || !this.wf) return null;
    const w = this.wf();
    const job = this.job;
    const self = this;
    return {
      job,
      wf: () => ({ stages: w.stages, fabricationData: w.fabricationData, signoffRecords: self.signoffRecords() }),
      selectedStep: () => self.selectedStep(),
      jobComplete: () => self.jobComplete(),
      soldSigned: () => self.soldSigned(),
      fabLocked: () => self.fabLocked(),
      rejectedCount: () => self.rejectedCount(),
      resultOptions: STAGE_RESULT_OPTIONS,
      fabErrors: () => self.fabErrors(),
      fieldErrors: () => self.fieldErrors(),
      editable: (s) => self.editable(s),
      inputsEditable: (s, i) => self.inputsEditable(s, i),
      canSignStage: (s) => self.canSignStage(s),
      canReopen: (s, i) => self.canReopen(s, i),
      visibleFields: (s) => self.visibleFields(s),
      visibleSignoffFields: (s) => self.visibleSignoffFields(s),
      startsGroup: (s, f) => self.startsGroup(s, f),
      fieldError: (sid, fk) => self.fieldError(sid, fk),
      getFabValue: (k) => self.getFabValue(k),
      getReviewValue: (k) => self.getReviewValue(k),
      fabFieldRequired: (f) => self.fabFieldRequired(f),
      defaultStepOption: (s) => self.defaultStepOption(s),
      jointDesignRequiresInsert: () => self.jointDesignRequiresInsert(),
      jointDesignRequiresBackingRing: () => self.jointDesignRequiresBackingRing(),
      stageInputBlur: (s, f, v) => self.stageInputBlur(s, f, v),
      stageSelectChange: (s, f, v) => self.stageSelectChange(s, f, v),
      blurSignoffField: (s, f, v) => self.blurSignoffField(s, f, v),
      signoffSelectChange: (s, f, v) => self.signoffSelectChange(s, f, v),
      signoffCheckboxChange: (s, f, c) => self.signoffCheckboxChange(s, f, c),
      toggleAffectedItem: (s, item, e) => self.toggleAffectedItem(s, item, e),
      onConsumableInsertChange: (s, v) => self.onConsumableInsertChange(s, v),
      on5xChange: (s, v) => self.on5xChange(s, v),
      updateStepType: (s, v) => self.updateStepType(s, v),
      setInspectionType: (v) => self.setInspectionType(v),
      setStageResult: (s, r) => self.setStageResult(s, r),
      signStage: (s) => self.signStage(s),
      reopenStage: (s) => self.reopenStage(s),
    };
  });

  /* fabrication cross-stage fields (Welding) — rebuilt each read so Location options stay fresh */
  fabFields = computed(() => {
    const fab = this.wf ? this.wf().fabricationData : {};
    const job = this.job;
    const mcl1Traceable = job ? requiresTraceability(job.mcl1) : false;
    const mcl2Traceable = job ? requiresTraceability(job.mcl2) : false;
    const anyTraceable = mcl1Traceable || mcl2Traceable;
    return FABRICATION_FIELDS
      .filter(f => !f.showIf || fab[f.showIf.key] === f.showIf.equals)
      .filter(f => {
        // MIC 1 only if joiningItem MCL requires traceability
        if (f.key === 'id1') return mcl1Traceable;
        // MIC 2 only if joinToItem MCL requires traceability
        if (f.key === 'id2') return mcl2Traceable;
        return true;
      })
      .map(f =>
        f.key === 'location'
          ? { ...f, options: getShops().map(s => ({ label: s, value: s.toLowerCase().replace(/\s+/g, '-') })) }
          : f.key === 'revisedJointDesign'
          ? { ...f, options: [{ label: '', value: '' }, ...jointDesignOptions()] }
          : f
      );
  });
  fabErrors = computed(() => {
    if (!this.wf) return {};
    const fab = this.wf().fabricationData;
    const errors: Record<string, string> = {};
    for (const f of FABRICATION_FIELDS) {
      if (f.requiredWhen) {
        const triggerVal = fab[f.requiredWhen.key] ?? '';
        if (f.requiredWhen.notEmpty && triggerVal.trim() && !(fab[f.key] ?? '').trim()) {
          errors[f.key] = `${f.label} is required when ${FABRICATION_FIELDS.find(ff => ff.key === f.requiredWhen!.key)?.label ?? f.requiredWhen.key} is set`;
        }
      }
      if (f.showIf && f.required) {
        if (fab[f.showIf.key] === f.showIf.equals && !(fab[f.key] ?? '').trim()) {
          errors[f.key] = `${f.label} is required`;
        }
      }
    }
    return errors;
  });
  isNdtStage = computed(() => {
    if (!this.wf) return false;
    const stage = this.wf().stages[this.selectedStep()];
    const id = stage?.id ?? '';
    return id.startsWith('root-ndt') || id.startsWith('layer-ndt') || id.startsWith('final-ndt')
      || id === 'repair';
  });

//extra fields when you press show more
  /* deterministic placeholder values, varied per job so the demo doesn't look templated */
  demo = computed(() => {
    const j = this.job;
    if (!j) return null;
    const id = j.id;
    const idNum = id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 0);
    const pick = (arr: string[], salt: number) => arr[(idNum * salt) % arr.length];
    return {
      // Job details
      priority:        pick(['Normal', 'High', 'Low', 'Urgent'], 7),
      workOrderType:   pick(['Corrective', 'Preventive', 'Inspection', 'Emergency'], 3),
      customer:        pick(['Acme Property Mgmt', 'Riverside HOA', 'Lakeview Apartments', 'Summit Facilities', 'Oakwood Realty'], 5),
      customerPhone:   `(555) 0${10 + (idNum % 89)}-${String(1000 + (idNum * 37) % 9000)}`,
      serviceAddress:  `${100 + (idNum * 13) % 9899} ${pick(['Maple Ave', 'Oak St', 'Cedar Ln', 'Pine Rd', 'Elm Blvd'], 11)}, ${pick(['Springfield', 'Riverton', 'Fairview', 'Madison', 'Clinton'], 17)}`,
      region:          `${pick(['Midwest', 'Northeast', 'South', 'West', 'Mountain'], 19)} · Branch ${1 + (idNum % 24)}`,
      warranty:        pick(['In warranty', 'Out of warranty', 'Extended'], 23),
      paymentTerms:    pick(['Net 30', 'Net 15', 'Net 60', 'Due on receipt'], 29),
      // Work validation
      laborHours:      (1 + (idNum * 7) % 80 / 10).toFixed(1),
      warrantyPeriod:  pick(['30 days', '90 days', '1 year', '2 years'], 31),
      disposalMethod:  pick(['Recycled', 'Landfill', 'Returned to vendor', 'Hazmat'], 37),
      followUp:        pick(['No', 'Yes'], 41),
      // Sign-off
      permitVerified:  pick(['Yes', 'N/A', 'Pending'], 43),
      testMethod:      pick(['Visual + functional', 'Pressure test', 'Meter reading', 'Load test'], 47),
      crewSize:        String(1 + (idNum % 4)),
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
    return stage.required && !stage.signed && stage.id === this.activeStage() && !this.soldSigned();
  }
  canDeactivate(): boolean {
    if (!this.wf) return true;
    const idx = this.lastModifiedStageIdx();
    if (idx < 0) return true;
    const stage = this.wf().stages[idx];
    if (!stage || stage.signed) return true;
    const hasInputData = Object.values(stage.inputs).some(v => v);
    const hasSignoffData = Object.values(stage.signoffInputs).some(v => v);
    return !hasInputData && !hasSignoffData;
  }
  /* inputs editable on active or unlocked optional stage */
  inputsEditable(stage: WorkflowStage, i: number): boolean {
    return !stage.signed && !this.locked(i) && !this.soldSigned();
  }
  /* only the last signed stage can reopen */
  canReopen(stage: WorkflowStage, i: number): boolean {
    if (!stage.signed || !this.wf) return false;
    // Sold stage: allow deprogress on the last signed stage only
    if (this.soldSigned()) {
      const lastSigned = this.wf().stages.map((s, idx) => ({ s, idx })).filter(x => x.s.signed).pop();
      return lastSigned?.idx === i;
    }
    return !this.wf().stages.slice(i + 1).some(s => s.required && s.signed);
  }
  canSignStage(stage: WorkflowStage): boolean {
    if (!this.editable(stage)) return false;
    // Auto-accept non-inspection steps
    if (!stage.rejectToStage && !stage.result) {
      return true;
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
      if (Object.keys(this.fabErrors()).length > 0) return false;
    }
    return stage.signoffFields
      .filter(f => {
        if (!f.required) return false;
        // For fit stage, make consumable and backing ring fields conditionally required
        if (stage.id === 'fit') {
          const isConsumable = ['consumableType', 'consumableSize', 'consumableId'].includes(f.key);
          const isBackingRing = ['backingRingType', 'backingRingId'].includes(f.key);
          if (isConsumable && !this.jointDesignRequiresInsert()) return false;
          if (isBackingRing && !this.jointDesignRequiresBackingRing()) return false;
        }
        return true;
      })
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
      this.wfService.updateStageSignoff(this.job!, stage.id, {
        stepType: value,
        fields: newFields,
        signoffInputs: {},
        signoffFields: newSignoff,
      }, { action: `${stage.label} — Type changed to ${value}` });
      return;
    }
    this.wfService.updateStageSignoff(this.job!, stage.id, {
      stepType: value,
    }, { action: `${stage.label} — Type changed to ${value}` });
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
    const job = this.job;
    /* Weld build-up on fit stage: compute fields from the tack template definition
       rather than relying on stage.fields, which may not have propagated yet
       when Angular re-evaluates the @if gate in the same change-detection tick. */
    if (stage.id === 'fit' && stage.stepType === 'weld-buildup') {
      const templates = job ? (getTemplates()[job.trade] ?? []) : [];
      const tackTpl = templates.find(t => t.id === 'tack');
      const base = tackTpl ? tackTpl.fields.map(f => ({ ...f })) : [];
      return [...base, { key: 'affectedItem', label: 'Affected Item', type: 'text' as const, required: true }];
    }
    const result = stage.fields.filter(f => {
      if (f.showIf) {
        const checkVal = f.showIf.key === 'inspectionType' ? stage.inspectionType : stage.inputs[f.showIf.key];
        if (f.showIf.anyOf) { if (!f.showIf.anyOf.includes(checkVal ?? '')) return false; }
        else if (checkVal !== f.showIf.equals) return false;
      }
      // MIC fields only visible when traceability is required
      if (f.key === 'consumableId' || f.key === 'backingRingId') {
        const mcl1Traceable = job ? requiresTraceability(job.mcl1) : false;
        const mcl2Traceable = job ? requiresTraceability(job.mcl2) : false;
        return mcl1Traceable || mcl2Traceable;
      }
      return true;
    });
    return result;
  }

  /* check if the current joint design requires consumable insert or backing ring */
  /* Revised Joint Design takes priority; falls back to joint details joint design */
  private effectiveJointDesign(): string {
    const fab = this.wf?.().fabricationData;
    const revised = fab?.['revisedJointDesign'] ?? '';
    return revised.trim() || (this.job?.jointDesign ?? '');
  }

  jointDesignRequiresInsert(): boolean {
    const code = this.effectiveJointDesign();
    if (!code) return false;
    const jd = getJointDesign(code);
    return jd?.requiresConsumableInsert || false;
  }

  jointDesignRequiresBackingRing(): boolean {
    const code = this.effectiveJointDesign();
    if (!code) return false;
    const jd = getJointDesign(code);
    return jd?.requiresBackingRing || false;
  }

  jointDesignRequiresEither(): boolean {
    return this.jointDesignRequiresInsert() || this.jointDesignRequiresBackingRing();
  }

  fabFieldRequired = (f: FabricationField): boolean => {
    if (!this.wf) return false;
    if (f.showIf && f.required) {
      const fab = this.wf().fabricationData;
      return fab[f.showIf.key] === f.showIf.equals;
    }
    if (!f.requiredWhen) return false;
    const val = (this.wf().fabricationData[f.requiredWhen.key] ?? '').trim();
    return f.requiredWhen.notEmpty ? val.length > 0 : val.length === 0;
  };

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

  /* map review verification field keys to job data values */
  private readonly REVIEW_VERIFY_MAP: Record<string, string> = {
    verifyDrawing: 'drawing', verifyDrawingRev: 'drawingRev',
    verifyJoint: 'joint', verifyJointDesign: 'jointDesign',
    verifyWeldType: 'weldType', verifyPipeSize: 'pipeSize',
    verifyWallThickness: 'wallThickness', verifyMaterial1: 'materialType1',
    verifyMaterial2: 'materialType2', verifyMcl1: 'mcl1', verifyMcl2: 'mcl2',
    verifyNdt: 'ndt', verifyPwht: 'pwht', verifyNInd: 'nInd',
    verifyWps: 'wps', verifyOrder: 'order', verifyWorkPackage: 'workPackage',
  };
  getReviewValue(fieldKey: string): string {
    const jobKey = this.REVIEW_VERIFY_MAP[fieldKey];
    if (!jobKey || !this.job) return '';
    return (this.job as any)[jobKey] ?? '';
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
      if (f.showIf) {
        const checkVal = stage.inputs[f.showIf.key];
        const visible = f.showIf.anyOf ? f.showIf.anyOf.includes(checkVal ?? '') : checkVal === f.showIf.equals;
        if (!visible && stage.inputs[f.key]) this.wfService.setStageInput(this.job, stage.id, f, '');
      }
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
      if (this.wf) this.lastModifiedStageIdx.set(this.wf().stages.indexOf(stage));
    }
    this.onFieldBlur(stage, field);
    /* clear required error if now filled */
    if (field.required && value) {
      const key = `${stage.id}:${field.key}`;
      const prev = this.fieldErrors();
      if (prev[key]?.endsWith('is required')) {
        const next = { ...prev };
        delete next[key];
        this.fieldErrors.set(next);
      }
    }
  }

  toggleAffectedItem(stage: WorkflowStage, item: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const raw = stage.inputs['affectedItems'] ?? '';
    const current = raw ? raw.split(',') : [];
    const next = checked ? [...current, item] : current.filter(i => i !== item);
    this.wfService.setStageInput(this.job!, stage.id, { key: 'affectedItems', type: 'text' } as StageField, next.join(','));
  }
  /* WTN → Weld Process mapping */
  private readonly WTN_PROCESS_MAP: Record<string, string> = {
    'wtn-101': 'smaw', 'wtn-102': 'gtaw', 'wtn-103': 'gmaw', 'wtn-201': 'fcaw'
  };
  /* WTN → PH/IP requirements mapping (NC = non-critical, no limit) */
  private readonly WTN_PHIP_MAP: Record<string, { phMin: string; phMax: string; ipMin: string; ipMax: string }> = {
    'wtn-101': { phMin: '120', phMax: '180', ipMin: '90', ipMax: 'NC' },
    'wtn-102': { phMin: 'NC', phMax: '170', ipMin: '85', ipMax: '140' },
    'wtn-103': { phMin: '115', phMax: 'NC', ipMin: 'NC', ipMax: '145' },
    'wtn-201': { phMin: '125', phMax: '185', ipMin: '95', ipMax: '155' },
  };
  /* WTNs that show Override Requirements on weld stages */
  private readonly WTN_OVERRIDE_WTNS = new Set(['wtn-101', 'wtn-201']);
  /* Override field values per WTN */
  private readonly WTN_OVERRIDE_VALUES: Record<string, { phMin: string; phMax: string; ipMin: string; ipMax: string; note: string }> = {
    'wtn-101': { phMin: '110', phMax: '170', ipMin: '85', ipMax: '140', note: 'Approved deviation per WPS-001' },
    'wtn-201': { phMin: '120', phMax: '180', ipMin: '90', ipMax: '150', note: 'Approved deviation per WPS-002' },
  };

  /* select fields commit on change, clear maps to '' */
  stageSelectChange(stage: WorkflowStage, field: StageField, value: string | null) {
    const v = value ?? '';
    if (this.job && v !== (stage.inputs[field.key] ?? '')) {
      this.wfService.setStageInput(this.job, stage.id, field, v);
      this.clearHidden(stage);
      if (this.wf) this.lastModifiedStageIdx.set(this.wf().stages.indexOf(stage));
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
      /* Populate/clear override fields on weld stages when WTN changes (disabled for demo)
      if (field.key === 'wtn' && this.job && this.wf) {
        const weldStages = ['tack', 'root-weld', 'final-weld'];
        const ov = this.WTN_OVERRIDE_VALUES[v];
        const overrideMap: Record<string, string> = ov
          ? { overridePhMin: ov.phMin, overridePhMax: ov.phMax, overrideIpMin: ov.ipMin, overrideIpMax: ov.ipMax, overrideNote: ov.note }
          : { overridePhMin: '', overridePhMax: '', overrideIpMin: '', overrideIpMax: '', overrideNote: '' };
        for (const s of this.wf().stages) {
          if (!weldStages.includes(s.id)) continue;
          for (const [fk, val] of Object.entries(overrideMap)) {
            const f = s.fields.find(ff => ff.key === fk);
            if (f) this.wfService.setStageInput(this.job, s.id, f, val);
          }
        }
      }*/
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

  /** Check if Override Requirements should show — any weld stage with a matching WTN enables it for all */
  showOverrideForStage(stage: WorkflowStage): boolean {
    if (!this.wf) return false;
    const weldStages = ['tack', 'root-weld', 'final-weld'];
    return this.wf().stages.some(s => weldStages.includes(s.id) && this.WTN_OVERRIDE_WTNS.has(s.inputs?.['wtn'] ?? ''));
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
    if (this.wf) this.lastModifiedStageIdx.set(this.wf().stages.indexOf(stage));
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
    if (this.wf) this.lastModifiedStageIdx.set(this.wf().stages.indexOf(stage));
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
    if (this.wf) this.lastModifiedStageIdx.set(this.wf().stages.indexOf(stage));
  }

  /* visibility of a signoff field (showIf support) */
  visibleSignoffFields(stage: WorkflowStage): SignoffField[] {
    return stage.signoffFields.filter(f => {
      if (f.showIf && stage.signoffInputs[f.showIf.key] !== f.showIf.equals) return false;
      // For fit stage, hide consumable and backing ring fields when not required
      if (stage.id === 'fit') {
        const isConsumable = ['consumableType', 'consumableSize', 'consumableId'].includes(f.key);
        const isBackingRing = ['backingRingType', 'backingRingId'].includes(f.key);
        if (isConsumable && !this.jointDesignRequiresInsert()) return false;
        if (isBackingRing && !this.jointDesignRequiresBackingRing()) return false;
      }
      return true;
    });
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
        const rawMin = f.minField ? stage.inputs?.[f.minField] : undefined;
        const rawMax = f.maxField ? stage.inputs?.[f.maxField] : undefined;
        const minVal = rawMin && rawMin !== 'NC' ? Number(rawMin) : NaN;
        const maxVal = rawMax && rawMax !== 'NC' ? Number(rawMax) : NaN;
        const belowMin = !isNaN(minVal) && num < minVal;
        const aboveMax = !isNaN(maxVal) && num > maxVal;
        if (belowMin || aboveMax) {
          const label = f.key === 'actualPh' ? 'Actual PH' : 'Actual IP';
          errors[`${stage.id}:${f.key}`] = `${label} Out of Range`;
        }
      }
    }
    /* Weld build-up: affectedItems + micVerified */
    if (stage.id === 'fit' && stage.stepType === 'weld-buildup') {
      const raw = stage.inputs?.['affectedItems'] ?? '';
      const items = raw ? raw.split(',') : [];
      if (!items.length) {
        errors[`${stage.id}:affectedItem`] = 'Select at least one Affected Item';
      }
      if (items.includes('joiningItem') && stage.inputs?.['micVerified1'] !== 'yes') {
        errors[`${stage.id}:affectedItem`] = 'Please verify MIC for ' + (this.job?.joiningItem || 'item');
      }
      if (items.includes('joinToItem') && stage.inputs?.['micVerified2'] !== 'yes') {
        errors[`${stage.id}:affectedItem`] = 'Please verify MIC for ' + (this.job?.joinToItem || 'item');
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
      const rawMin = field.minField ? curStage?.inputs?.[field.minField] : undefined;
      const rawMax = field.maxField ? curStage?.inputs?.[field.maxField] : undefined;
      const minVal = rawMin && rawMin !== 'NC' ? Number(rawMin) : NaN;
      const maxVal = rawMax && rawMax !== 'NC' ? Number(rawMax) : NaN;
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
    // Auto-accept non-inspection steps
    if (!stage.rejectToStage && !stage.result) {
      this.setStageResult(stage, 'sat' as StageResult);
    }
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
          const from = this.route.snapshot.queryParamMap.get('from');
          this.router.navigate([from === 'assignments' ? '/assignments' : '/table']);
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
        const from = this.route.snapshot.queryParamMap.get('from');
        this.router.navigate([from === 'assignments' ? '/assignments' : '/table']);
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
  addAttachments(files: FileList) {
    if (!this.job) return;
    for (const f of Array.from(files)) this.wfService.addAttachment(this.job, f.name);
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
    const from = this.route.snapshot.queryParamMap.get('from');
    this.router.navigate([from === 'assignments' ? '/assignments' : '/table']);
  }

}
