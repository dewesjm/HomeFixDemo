//This is the job details page, lot of stuff in here

import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmService } from '../../shared/confirm.service';
import { SyncStatusComponent } from '../sync-status/sync-status.component';
import { RoutingBarComponent } from '../routing-bar/routing-bar.component';
import { JointDetailsComponent } from '../joint-details/joint-details.component';
import { AttachmentsComponent } from '../attachments/attachments.component';
import { FabricationComponent } from '../fabrication/fabrication.component';
import { SignoffPanelComponent, SignoffContext } from '../signoff-panel/signoff-panel.component';
import { DeviationAcceptDialogComponent, DeviationAcceptRequest } from '../deviation-dialog/deviation-accept-dialog.component';

import { JOBS, Job } from '../../data/jobs';
import { characteristicLabel } from '../../data/characteristics';

import { getJointDesign, jointDesignOptions } from '../../data/joint-designs';
import { RoutingService } from '../services/routing.service';
import { SignoffService } from '../services/signoff.service';
import { AttachmentService } from '../services/attachment.service';
import { FabricationDataService } from '../services/fabrication-data.service';
import { DeviationService } from '../services/deviation.service';
import { detectDeviations, isActualOutOfRange } from '../../data/deviations';
import { testUserQuals } from '../../data/qualifications';
import { WorkflowStore } from '../services/workflow-store.service';
import {
  WorkflowStage, StageField, SignoffField, StageResult, STAGE_RESULT_OPTIONS, hasDecision, isStageLocked, currentRoutingLabel, activeStageId, allRequiredSigned, getTemplates, FABRICATION_FIELDS, FabricationField,
  shopOptions, WELD_OVERRIDE_FIELDS, snapshotInputs, SignoffInput, isFieldLocked, ACTUAL_REQUIREMENT, ACTUAL_MIN_MAX, DeviationItem, actualOrderError, SHOW_WELD_OVERRIDES, excavationNdtStage, isRepairStageId, isExcavationNdtStageId, repairIdForExcavation, SignoffRecord
} from '../../data/workflow';
import { requiresTraceability } from '../../data/mcl-traceability';
import { isNonFerrousOrAustenitic } from '../../data/material-classification';
import {
  gwpOptionsForMaterials, wtnOptionsForGwp, gwpDescription, wtnDescription, getProcedureByGwpWtn, hasOverride as procedureHasOverride,
  fillerMetalTypeOptionsForProcedure, fillerMetalSizeOptionsForProcedure, FILLER_METAL_TYPE_OPTIONS, FILLER_METAL_SIZE_OPTIONS
} from '../../data/procedures';

/* fabrication values that must be present before Fit can be signed -- id1/id2 (MIC 1/MIC 2) are
   only checked when that joint member's MCL requires traceability, same as their visibility */
const FIT_REQUIRED_FABRICATION: Record<string, string> = {
  location: 'Location', id1: 'MIC 1', id2: 'MIC 2', drawingRev: 'Drawing Rev', actualThickness: 'Actual Thickness',
};

@Component({
  selector: 'app-joint-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, SyncStatusComponent, RoutingBarComponent, JointDetailsComponent, AttachmentsComponent, FabricationComponent, SignoffPanelComponent,
    DeviationAcceptDialogComponent
  ],
  templateUrl: './joint-page.component.html'
})
export class JointPageComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(WorkflowStore);
  private wfService = inject(RoutingService);
  private signoffService = inject(SignoffService);
  private attachmentService = inject(AttachmentService);
  private fabricationService = inject(FabricationDataService);
  private deviationService = inject(DeviationService);
  private confirm = inject(ConfirmService);

  job: Job | undefined = JOBS.find(j => j.id === this.route.snapshot.paramMap.get('id'));
  wf = this.job ? this.store.workflowFor(this.job) : null;

  /* snapshot of state as loaded, so unsigned/unsaved edits (Fab data, stage inputs, sign-off
     fields, routing type choice) can be discarded when the user leaves without signing */
  private readonly loadSnapshot = this.wf ? this.captureSnapshot() : null;

  private captureSnapshot(): { fabricationData: Record<string, string>; stages: Record<string, WorkflowStage> } {
    const w = this.wf!();
    const stages: Record<string, WorkflowStage> = {};
    for (const s of w.stages) {
      stages[s.id] = { ...s, inputs: { ...s.inputs }, signoffInputs: { ...s.signoffInputs }, fields: [...s.fields], signoffFields: [...s.signoffFields] };
    }
    return { fabricationData: { ...w.fabricationData }, stages };
  }

  private recordEquals(a: Record<string, string>, b: Record<string, string>): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) if ((a[k] ?? '') !== (b[k] ?? '')) return false;
    return true;
  }

  /* true when the technician has entered Fab or sign-off data on an unsigned stage that
     hasn't been discarded/committed yet */
  private hasUnsavedChanges(): boolean {
    if (!this.wf || !this.loadSnapshot) return false;
    if (Object.values(this.reported()).some(r => r.length)) return true;
    const w = this.wf();
    const fitSigned = w.stages.find(s => s.id === 'fit')?.signed ?? false;
    if (!fitSigned && !this.recordEquals(w.fabricationData, this.loadSnapshot.fabricationData)) return true;
    for (const s of w.stages) {
      if (s.signed) continue;
      const snap = this.loadSnapshot.stages[s.id];
      if (!snap) continue;
      if (!this.recordEquals(s.inputs, snap.inputs)) return true;
      if (!this.recordEquals(s.signoffInputs, snap.signoffInputs)) return true;
      if (s.routingType !== snap.routingType) return true;
    }
    return false;
  }

  /* Discard any unsigned/unsaved Fab and sign-off edits made this visit, so re-entering the
     joint later doesn't hold onto data that was never signed off. */
  ngOnDestroy() {
    if (!this.job || !this.wf || !this.loadSnapshot) return;
    const snapshot = this.loadSnapshot;
    this.wf.update(wf => {
      const fitSigned = wf.stages.find(s => s.id === 'fit')?.signed ?? false;
      const fabricationData = fitSigned ? wf.fabricationData : { ...snapshot.fabricationData };
      const stages = wf.stages.map(s => {
        if (s.signed) return s;
        const snap = snapshot.stages[s.id];
        if (!snap) return s;
        return { ...snap, inputs: { ...snap.inputs }, signoffInputs: { ...snap.signoffInputs }, fields: [...snap.fields], signoffFields: [...snap.signoffFields] };
      });
      return { ...wf, fabricationData, stages };
    });
  }


  /* routing model: only show stages that are signed, required, or the current active stage */
  routingModel = computed<{ label: string; disabled: boolean; stageIndex: number }[]>(() => {
    if (!this.wf) return [];
    const stages = this.wf().stages;
    const activeIdx = stages.findIndex(s => !s.signed);
    return stages
      .map((s, i) => ({ label: s.displayName || s.label, disabled: this.locked(i), signed: s.signed, required: s.required, stageIndex: i }))
      .filter(s => s.signed || s.required || s.stageIndex === activeIdx)
      .map(s => ({ label: s.label, disabled: s.disabled, stageIndex: s.stageIndex }));
  });
  /* which stage's sign-off shows; defaults to active */
  selectedRouting = signal<number>(this.initialRouting());
  /* inline field validation errors: key = `${stageId}:${fieldKey}` */
  fieldErrors = signal<Record<string, string>>({});

  activeRoutingLabel = computed(() => {
    const stages = this.routingModel();
    const idx = this.selectedRouting();
    const match = stages.find(s => s.stageIndex === idx);
    return match?.label ?? '';
  });

  currentRouting = computed(() => (this.wf ? currentRoutingLabel(this.wf().stages) : ''));
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
    const all: SignoffRecord[] = [];
    for (const s of this.wf().stages) {
      /* no SAT badge on stages where nobody chose SAT/UNSAT */
      for (const r of s.signoffRecords) all.push(hasDecision(s) ? r : { ...r, result: null });
    }
    return all.sort((a, b) => a.when.localeCompare(b.when));
  });

  /* inspection/NDT stages must have the inspector explicitly choose what was performed */
  inspectionTypeRequired(stage: WorkflowStage): boolean {
    return stage.id !== 'fit' && (stage.role ?? '').includes('Inspector') && !!stage.routingOptions?.length;
  }

  defaultRoutingOption(stage: WorkflowStage): string {
    if (!stage.routingOptions?.length) return '';
    return stage.routingOptions.find(o => o.default)?.value ?? stage.routingOptions[0].value;
  }

  signoffCtx = computed<SignoffContext | null>(() => {
    if (!this.job || !this.wf) return null;
    const w = this.wf();
    const job = this.job;
    const self = this;
    return {
      job,
      wf: () => ({ stages: w.stages, fabricationData: w.fabricationData, signoffRecords: self.signoffRecords() }),
      selectedRouting: () => self.selectedRouting(),
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
      clearFieldError: (sid, fk) => self.clearFieldError(sid, fk),
      getFabValue: (k) => self.getFabValue(k),
      getReviewValue: (k) => self.getReviewValue(k),
      fabFieldRequired: (f) => self.fabFieldRequired(f),
      defaultRoutingOption: (s) => self.defaultRoutingOption(s),
      inspectionTypeRequired: (s) => self.inspectionTypeRequired(s),
      jointDesignRequiresInsert: () => self.jointDesignRequiresInsert(),
      jointDesignRequiresBackingRing: () => self.jointDesignRequiresBackingRing(),
      hasOverrideFields: (s) => self.visibleFields(s).some(f => f.key.startsWith('override')),
      repairRouteLabel: (s) => self.repairRouteLabel(s),
      holdNote: () => self.holdNote(),
      fieldWarning: (s, k) => self.fieldWarning(s, k),
      reportedDeviations: (s) => self.reported()[s.id] ?? [],
      reportDeviation: (s) => self.reportDeviation(s),
      removeReportedDeviation: (s, i) => self.removeReportedDeviation(s, i),
      stageInputBlur: (s, f, v) => self.stageInputBlur(s, f, v),
      stageSelectChange: (s, f, v) => self.stageSelectChange(s, f, v),
      blurSignoffField: (s, f, v) => self.blurSignoffField(s, f, v),
      signoffSelectChange: (s, f, v) => self.signoffSelectChange(s, f, v),
      signoffCheckboxChange: (s, f, c) => self.signoffCheckboxChange(s, f, c),
      toggleAffectedItem: (s, item, e) => self.toggleAffectedItem(s, item, e),
      onConsumableInsertChange: (s, v) => self.onConsumableInsertChange(s, v),
      on5xChange: (s, v) => self.on5xChange(s, v),
      updateRoutingType: (s, v) => self.updateRoutingType(s, v),
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
    return FABRICATION_FIELDS
      .filter(f => !f.showIf || fab[f.showIf.key] === f.showIf.equals)
      .filter(f => {
        // MIC 1 only if joiningItem MCL requires traceability
        if (f.key === 'id1') return mcl1Traceable;
        // MIC 2 only if joinToItem MCL requires traceability
        if (f.key === 'id2') return mcl2Traceable;
        return true;
      })
      .map(f => this.withRuntimeOptions(f));
  });
  /* Location and Revised Joint Design get their options at runtime (admin lists); the static
     field definition has none. Anything that shows a fabrication value's label must go through this. */
  private withRuntimeOptions(f: FabricationField): FabricationField {
    if (f.key === 'location') return { ...f, options: shopOptions() };
    if (f.key === 'revisedJointDesign') return { ...f, options: [{ label: '', value: '' }, ...jointDesignOptions()] };
    return f;
  }
  fabErrors = computed(() => {
    if (!this.wf) return {};
    const fab = this.wf().fabricationData;
    const job = this.job;
    const mcl1Traceable = job ? requiresTraceability(job.mcl1) : false;
    const mcl2Traceable = job ? requiresTraceability(job.mcl2) : false;
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
      // Plain required fields (no showIf): id1/id2 (MIC 1/2) only when that member's MCL requires
      // traceability -- same condition FIT_REQUIRED_FABRICATION and fabFields() use
      if (f.required && !f.showIf) {
        if (f.key === 'id1' && !mcl1Traceable) continue;
        if (f.key === 'id2' && !mcl2Traceable) continue;
        if (!(fab[f.key] ?? '').trim()) {
          errors[f.key] = `${f.label} is required`;
        }
      }
    }
    return errors;
  });
  /* MT and PT (the *-ndt-mtpt stages) don't get Attachments -- UT/RT, VT/5X, Repair and
     Excavation NDT do (Excavation NDT inferred, not explicitly asked -- it's "just" another NDT
     stage, so it's treated like UT/RT/VT/5X rather than MT/PT's carve-out) */
  isNdtStage = computed(() => {
    if (!this.wf) return false;
    const stage = this.wf().stages[this.selectedRouting()];
    const id = stage?.id ?? '';
    if (id.endsWith('-mtpt')) return false;
    return id.startsWith('root-ndt') || id.startsWith('layer-ndt') || id.startsWith('final-ndt')
      || isRepairStageId(id) || isExcavationNdtStageId(id);
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
  private initialRouting(): number { return this.indexOfActive(); }

  // ---- stage display helpers ----
  /* locked until prior required stages signed */
  locked(i: number): boolean {
    return this.wf ? isStageLocked(this.wf().stages, i) : true;
  }
  /* sign-off editable only on the active stage */
  editable(stage: WorkflowStage): boolean {
    return stage.required && !stage.signed && stage.id === this.activeStage() && !this.soldSigned() && !this.heldAt(stage);
  }
  canDeactivate(): boolean {
    return !this.hasUnsavedChanges();
  }
  /* inputs editable on active or unlocked optional stage */
  inputsEditable(stage: WorkflowStage, i: number): boolean {
    return !stage.signed && !this.locked(i) && !this.soldSigned() && !this.heldAt(stage);
  }

  // ---- deviations ----
  /* Report Deviation entries typed on each unsigned stage, keyed by stage id. Like any other
     unsigned input they're dropped when leaving the joint; signing records them. */
  reported = signal<Record<string, string[]>>({});
  /* the acceptance screen Signoff opens when the stage has deviations */
  deviationRequest = signal<(DeviationAcceptRequest & { stage: WorkflowStage }) | null>(null);

  private openDeviations = computed(() => (this.wf ? this.deviationService.openDeviations(this.wf()) : []));
  holdNote = computed(() => {
    const d = this.openDeviations()[0];
    if (!d) return '';
    const when = new Date(d.when).toLocaleDateString();
    return `On hold: a deviation was accepted at ${d.stageLabel} on ${when}. No later step can be signed until it is dealt with, and that part isn't built yet.`;
  });
  /* an open deviation holds every step except the one it was accepted on, which can still be re-signed after a re-open */
  private heldAt(stage: WorkflowStage): boolean {
    const open = this.openDeviations();
    return open.length > 0 && !open.some(d => d.stageId === stage.id);
  }

  /* reporting a deviation lets Filler Metal Type/Size be picked from the full list */
  private offListUnlocked(stage: WorkflowStage): boolean {
    return (this.reported()[stage.id] ?? []).length > 0;
  }

  fieldWarning(stage: WorkflowStage, key: string): string {
    if (isActualOutOfRange(stage, key)) return 'Out of range, signing will record a deviation';
    if ((key === 'fillerMetalType' || key === 'fillerMetalSize') && stage.inputs[key]) {
      const f = stage.fields.find(ff => ff.key === key);
      const offList = detectDeviations(stage, new Set([key]), testUserQuals()).some(d => d.kind === 'off-list' && d.label === f?.label);
      if (offList) return 'Not allowed by the WPS, signing will record a deviation';
    }
    return '';
  }

  reportDeviation(stage: WorkflowStage) {
    const fillerNote = stage.fields.some(f => f.key === 'fillerMetalType')
      ? ' Reporting also lets Filler Metal Type and Size be picked from the full list, not only what the WPS allows.'
      : '';
    this.confirm.confirm({
      header: `Report deviation — ${stage.label}`,
      message: `Describe what was done differently from the procedure. It's listed for acceptance when you sign.${fillerNote}`,
      textInput: { label: 'What was different', placeholder: 'e.g. preheat applied with a different method' },
      acceptLabel: 'Report',
      accept: (text) => {
        const t = (text ?? '').trim();
        if (t) this.reported.update(r => ({ ...r, [stage.id]: [...(r[stage.id] ?? []), t] }));
      },
    });
  }

  removeReportedDeviation(stage: WorkflowStage, index: number) {
    this.reported.update(r => ({ ...r, [stage.id]: (r[stage.id] ?? []).filter((_, i) => i !== index) }));
    if (this.offListUnlocked(stage) || !this.job) return;
    /* last report removed: the filler droplists narrow back to the WPS, so drop values it doesn't allow */
    const st = this.wf?.().stages.find(s => s.id === stage.id);
    if (!st) return;
    const vis = new Set(this.visibleFields(st).map(f => f.key));
    const offList = detectDeviations(st, vis, testUserQuals()).filter(d => d.kind === 'off-list');
    const changes = st.fields
      .filter(f => (f.key === 'fillerMetalType' || f.key === 'fillerMetalSize') && offList.some(d => d.label === f.label))
      .map(f => ({ field: f, value: '' }));
    if (changes.length) this.wfService.setStageInputs(this.job, st.id, changes);
  }

  /* detected deviations plus the reported ones, for the acceptance screen */
  private stageDeviations(stage: WorkflowStage): DeviationItem[] {
    const vis = new Set(this.visibleFields(stage).map(f => f.key));
    const reported = (this.reported()[stage.id] ?? []).map(text => ({ kind: 'reported' as const, label: 'Reported', entered: text, required: '—' }));
    return [...detectDeviations(stage, vis, testUserQuals()), ...reported];
  }

  acceptDeviations(reason: string) {
    const req = this.deviationRequest();
    this.deviationRequest.set(null);
    if (!req || !this.job) return;
    this.deviationService.record(this.job, req.stage.id, req.items, reason);
    this.reported.update(r => ({ ...r, [req.stage.id]: [] }));
    this.signoffService.signStage(this.job, req.stage.id, this.signoffSnapshot(req.stage));
    /* no 5X auto-sign: the joint is now on hold */
    this.router.navigate([this.backDestination()]);
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
  /* Signoff fields currently required, accounting for Fit/Pre-Fit's joint-design + traceability
     conditions on Consumable Insert/Backing Ring -- shared by signBlockers() (reasons list) and
     validateStageFields() (per-field highlighting) so they can't drift out of sync. */
  private requiredSignoffFields(stage: WorkflowStage): SignoffField[] {
    return stage.signoffFields.filter(f => {
      if (stage.id === 'fit' || stage.id === 'pre-fit') {
        const insertApplies = this.jointDesignRequiresInsert();
        const backingApplies = this.jointDesignRequiresBackingRing();
        const micApplies = this.job
          ? requiresTraceability(this.job.mcl1) || requiresTraceability(this.job.mcl2) : false;
        if (f.key === 'consumableInsertType' || f.key === 'consumableInsertSize') return insertApplies;
        if (f.key === 'consumableInsertId') return insertApplies && micApplies;
        if (f.key === 'backingRingType') return backingApplies;
        if (f.key === 'backingRingId') return backingApplies && micApplies;
        return !!f.required;
      }
      return !!f.required;
    });
  }

  /* Everything currently preventing this stage from being signed, in reader-friendly wording. */
  signBlockers(stage: WorkflowStage): string[] {
    if (this.heldAt(stage)) return ['On hold for an open deviation'];
    if (!this.editable(stage)) return ['Earlier routing must be signed off first'];
    const reasons: string[] = [];
    if (hasDecision(stage) && !stage.result) reasons.push('Choose SAT or UNSAT');
    if (this.inspectionTypeRequired(stage) && !stage.inspectionType) reasons.push('Select the inspection performed');
    if (stage.repeatable && !stage.routingType) reasons.push('Choose the routing type');
    // Fit: fabrication data must have Location, MIC 1, MIC 2, Drawing Rev, Actual Thickness
    if (stage.id === 'fit' && this.wf) {
      const fab = this.wf().fabricationData;
      const mcl1Traceable = this.job ? requiresTraceability(this.job.mcl1) : false;
      const mcl2Traceable = this.job ? requiresTraceability(this.job.mcl2) : false;
      const missing = Object.entries(FIT_REQUIRED_FABRICATION)
        .filter(([k]) => k !== 'id1' || mcl1Traceable)
        .filter(([k]) => k !== 'id2' || mcl2Traceable)
        .filter(([k]) => !fab[k]?.trim())
        .map(([, label]) => label);
      if (missing.length) reasons.push(`Fabrication: ${missing.join(', ')}`);
    }
    // Fit-Up Insp: all verification checkboxes must be checked
    if (stage.id === 'fitup-insp') {
      if (!stage.fields.every(f => f.type === 'checkbox' && stage.inputs[f.key] === 'yes')) reasons.push('Verify every fitting value');
      if (Object.keys(this.fabErrors()).length > 0) reasons.push('Fix the fabrication errors');
    }
    // RT NDT: Degree of RT Performed must match the job's required degree (rtRoot/rtFinal)
    if (stage.inspectionType === 'rt') {
      const required = this.rtDegreeRequired(stage);
      if (required && stage.inputs['degreeRt'] !== required) {
        reasons.push(`Degree of RT Performed must be ${required}`);
      }
    }
    const missingSignoff = this.requiredSignoffFields(stage)
      .filter(f => (stage.signoffInputs[f.key] ?? '').trim().length === 0)
      .map(f => f.label);
    if (missingSignoff.length) reasons.push(`Fill in ${missingSignoff.join(', ')}`);
    return reasons;
  }

  canSignStage(stage: WorkflowStage): boolean {
    return this.signBlockers(stage).length === 0;
  }

  /* after a failed sign attempt: bring the first validation error into view and focus its field */
  private focusFirstError() {
    setTimeout(() => {
      const err = document.querySelector('.signoff-panel div.text-error.text-xs');
      if (!err) return;
      err.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (err.parentElement?.querySelector('input, select') as HTMLElement | null)?.focus({ preventScroll: true });
    });
  }

  updateRoutingType(stage: WorkflowStage, value: string) {
    if (!this.job || !this.wf) return;
    if (value) this.clearFieldError(stage.id, '__routingType');
    const templates = getTemplates()[this.job.trade] ?? [];
    /* Fit stage: swap fields when switching between Fit and Weld Build-Up */
    if (stage.id === 'fit') {
      const fitTpl = templates.find(t => t.id === 'fit');
      const tackTpl = templates.find(t => t.id === 'tack');
      const newFields = value === 'weld-buildup' && tackTpl
        ? [...tackTpl.fields.map(f => ({ ...f })), ...WELD_OVERRIDE_FIELDS.map(f => ({ ...f })), { key: 'affectedItem', label: 'Affected Item', type: 'text' as const, required: true }]
        : (fitTpl?.fields ?? []).map(f => ({ ...f }));
      const newSignoff = value === 'weld-buildup'
        ? []
        : (fitTpl?.signoffFields ?? []).map(f => ({ ...f }));
      this.signoffService.updateStageSignoff(this.job!, stage.id, {
        routingType: value,
        fields: newFields,
        signoffInputs: {},
        signoffFields: newSignoff,
      }, { action: `${stage.label} — Type changed to ${value}` });
      return;
    }
    this.signoffService.updateStageSignoff(this.job!, stage.id, {
      routingType: value,
    }, { action: `${stage.label} — Type changed to ${value}` });
  }

  swapStageOptions(stage: WorkflowStage): { label: string; value: string }[] {
    if (!this.job) return [];
    const templates = getTemplates()[this.job.trade] ?? [];
    return templates
      .filter(t => t.id !== 'prep' && t.id !== 'handover')
      .map(t => ({ label: t.label, value: t.id }));
  }
  updateSwapStage(stage: WorkflowStage, swapId: string) {
    if (!this.job || !this.wf) return;
    const currentRouting = this.selectedRouting();
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
    // Ensure the routing selection doesn't shift during re-render
    this.selectedRouting.set(currentRouting);
  }

  // ---- stage inputs ----
  /* fields with no showIf always show; conditional ones show when their trigger matches */
  visibleFields(stage: WorkflowStage): StageField[] {
    const job = this.job;
    const isFitWeldBuildup = stage.id === 'fit' && stage.routingType === 'weld-buildup';
    /* Weld build-up on fit stage: compute fields from the tack template definition (plus override
       fields, which Fit doesn't get at buildStages() time since it isn't itself a weld stage)
       rather than relying on stage.fields, which may not have propagated yet when Angular
       re-evaluates the @if gate in the same change-detection tick. */
    const rawFields = isFitWeldBuildup
      ? (() => {
          const templates = job ? (getTemplates()[job.trade] ?? []) : [];
          const tackTpl = templates.find(t => t.id === 'tack');
          return [...(tackTpl?.fields ?? []), ...WELD_OVERRIDE_FIELDS];
        })()
      : stage.fields;
    const result = rawFields
      .map(f => this.withStageRuntimeOptions(f, stage))
      .filter(f => {
        /* "exceeded" sends the joint to that phase's UT/RT, so it only shows when the joint has one */
        if (f.key === 'allowableThicknessExceeded'
            && !this.wf?.().stages.some(s => s.id === `${stage.inputs['originPhase'] ?? ''}-ndt-utrt`)) return false;
        if (f.showIf) {
          const checkVal = f.showIf.key === 'inspectionType' ? stage.inspectionType
            : f.showIf.key === 'result' ? stage.result
            : stage.inputs[f.showIf.key];
          if (f.showIf.anyOf) { if (!f.showIf.anyOf.includes(checkVal ?? '')) return false; }
          else if (checkVal !== f.showIf.equals) return false;
          if (f.showIf.and) {
            for (const cond of f.showIf.and) {
              const v = cond.key === 'result' ? stage.result : stage.inputs[cond.key];
              if (v !== cond.equals) return false;
            }
          }
        }
        // MIC fields only visible when traceability is required
        if (f.key === 'consumableInsertId' || f.key === 'backingRingId') {
          const mcl1Traceable = job ? requiresTraceability(job.mcl1) : false;
          const mcl2Traceable = job ? requiresTraceability(job.mcl2) : false;
          return mcl1Traceable || mcl2Traceable;
        }
        // Weld Position's row is only rendered when N Ind. is '1' (see WELD_GROUPS in
        // signoff-panel.component.ts) -- keep this in step so required-ness isn't enforced
        // against a field the user can't see or fill in
        if (f.key === 'weldPosition') return job?.nInd === '1';
        // Override fields only visible when the selected GWP+WTN's WPS has override values set
        if (f.key.startsWith('override')) {
          if (!SHOW_WELD_OVERRIDES) return false;
          const proc = getProcedureByGwpWtn(stage.inputs?.['weldProcedure'] ?? '', stage.inputs?.['wtn'] ?? '');
          if (!proc || !procedureHasOverride(proc)) return false;
        }
        return true;
      });
    return result;
  }

  /* GWP and WTN cascade from Weld Engineering's procedures data: GWP is filtered to whichever GWPs
     are qualified for this job's base metal pair (Material Type 1/2), WTN is then filtered to
     whichever GWP is currently selected on this stage. Filler Metal Type/Size then cascade from the
     Procedure that GWP+WTN resolves to -- same pattern, one step further down the chain. */
  /* Root's RT requirement is job.rtRoot, Final Weld's is job.rtFinal; Layer's RT NDT has no
     matching requirement field on Job, so nothing is enforced there. */
  private rtDegreeRequired(stage: WorkflowStage): string {
    if (stage.id === 'root-ndt-utrt') return this.job?.rtRoot ?? '';
    if (stage.id === 'final-ndt-utrt') return this.job?.rtFinal ?? '';
    return '';
  }

  /* Demo aid: shows where Repair (or the Excavation NDT it can insert) will actually route to on
     signoff, given current inputs -- mirrors SignoffService.signStage()'s routing exactly:
       Repair: Allowable thickness exceeded takes priority -> that phase's NDT UT/RT; else Grind
         Only -> that phase's NDT VT/5X; else Weld Repair -> inserts Excavation NDT; else Cut ->
         starts over from Fit, Refit # up by one; no code chosen -> nothing shown.
       Excavation NDT (SAT only -- UNSAT already routes back to Repair via rejectToStage): "the
         original joint inspection" (whatever NDT stage/method actually rejected the joint),
         unless that was PT and the job's material (Material Type 1 or 2, Admin > Material
         Classification) is non-ferrous or austenitic, in which case 5X instead of PT. */
  /* Names the actual stage Excavation NDT's SAT routes back to (the exact NDT stage that
     originally rejected the joint, or that phase's VT/5X if the PT/material override applies) --
     shared by the Repair-stage hint (names it up front, before Excavation NDT even exists yet)
     and the Excavation NDT-stage hint (names it there too). `repair` is the Repair stage carrying
     the origin bookkeeping (`inputs['originPhase'/'originStageId'/'originInspectionType']`). */
  private originInspectionLabel(repair: WorkflowStage | undefined, labelOf: (id: string) => string): string {
    if (!this.job || !repair) return 'the original joint inspection';
    const phase = repair.inputs['originPhase'] ?? '';
    const originStageId = repair.inputs['originStageId'] ?? '';
    const originInspectionType = repair.inputs['originInspectionType'] ?? '';
    const needs5xInstead = originInspectionType === 'pt' && phase
      && (isNonFerrousOrAustenitic(this.job.materialType1) || isNonFerrousOrAustenitic(this.job.materialType2));
    if (needs5xInstead) {
      return `${labelOf(`${phase}-ndt-vt5x`)} (5X instead of PT — material is non-ferrous or austenitic)`;
    }
    return originStageId ? labelOf(originStageId) : 'the original joint inspection';
  }

  repairRouteLabel(stage: WorkflowStage): string {
    if (!this.job) return '';
    const templates = getTemplates()[this.job.trade] ?? [];
    const labelOf = (id: string) => templates.find(t => t.id === id)?.label ?? id;
    if (isRepairStageId(stage.id)) {
      const phase = stage.inputs['originPhase'] ?? '';
      if (stage.inputs['allowableThicknessExceeded'] === 'yes') {
        return phase ? `On signoff, this routes back to ${labelOf(`${phase}-ndt-utrt`)}.` : '';
      }
      const repairType = stage.inputs['repairType'] ?? '';
      if (repairType === 'grind') {
        const target = stage.inputs['originStageId'] ?? '';
        return target ? `On signoff, this routes to ${labelOf(target)}.` : '';
      }
      if (repairType === 'weld-repair') {
        return `On signoff, this routes to ${excavationNdtStage('', stage.id).label}; SAT there routes back to ${this.originInspectionLabel(stage, labelOf)}, UNSAT routes back to ${stage.label}.`;
      }
      if (repairType === 'cut') {
        return `On signoff, the joint starts over from ${labelOf('fit')} and continues along the path from there. Past records are kept, and Refit # goes up to ${String(Number(this.job.refitNumber || '0') + 1).padStart(2, '0')}.`;
      }
      return '';
    }
    if (isExcavationNdtStageId(stage.id) && this.wf) {
      const repair = this.wf().stages.find(s => s.id === repairIdForExcavation(stage.id));
      return `On SAT, this routes back to ${this.originInspectionLabel(repair, labelOf)}. UNSAT routes back to ${repair?.label ?? 'Repair'}.`;
    }
    return '';
  }

  private withStageRuntimeOptions(f: StageField, stage: WorkflowStage): StageField {
    if (f.key === 'degreeRt') {
      const required = this.rtDegreeRequired(stage);
      return required ? { ...f, label: `${f.label} (Required: ${required})` } : f;
    }
    const gwp = stage.inputs?.['weldProcedure'] ?? '';
    if (f.key === 'weldProcedure') {
      return {
        ...f,
        options: gwpOptionsForMaterials(this.job?.materialType1 ?? '', this.job?.materialType2 ?? ''),
        description: gwp ? gwpDescription(gwp) : '',
      };
    }
    if (f.key === 'wtn') {
      const wtn = stage.inputs?.['wtn'] ?? '';
      return { ...f, options: wtnOptionsForGwp(gwp), description: wtn ? wtnDescription(gwp, wtn) : '' };
    }
    if (f.key === 'fillerMetalType' || f.key === 'fillerMetalSize') {
      /* Locked (consumable insert copied the value): show the full option set, not the
         current WPS's narrower list, so a value copied from Fit's Consumable Insert Type/Size
         always has a matching <option> and renders instead of appearing blank -- the field
         isn't user-selectable in this state anyway, so the WPS-specific filtering is moot. */
      if (isFieldLocked(stage, f) || this.offListUnlocked(stage)) {
        return { ...f, options: f.key === 'fillerMetalType' ? FILLER_METAL_TYPE_OPTIONS : FILLER_METAL_SIZE_OPTIONS };
      }
      const proc = getProcedureByGwpWtn(stage.inputs?.['weldProcedure'] ?? '', stage.inputs?.['wtn'] ?? '');
      return {
        ...f,
        options: f.key === 'fillerMetalType' ? fillerMetalTypeOptionsForProcedure(proc) : fillerMetalSizeOptionsForProcedure(proc)
      };
    }
    return f;
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
    const options = fabField ? this.withRuntimeOptions(fabField).options : undefined;
    if (fabField?.type === 'select' && options) {
      const match = options.find(o => o.value === val);
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
  /* blank any dependent field whose trigger no longer matches, so hidden fields don't keep stale
     values -- showIf resolution must match visibleFields()'s exactly (inspectionType/result live
     on the stage itself, not stage.inputs). Bug fixed 2026-09-23: this always read stage.inputs
     for every key including 'inspectionType', which is never actually stored there (it's
     stage.inspectionType) -- so it read undefined, treated any inspectionType-gated field
     (degreeRt, rtFileNumber, defectCode, penetrantManufacturer/Type, weldColor, idAccessible) as
     always hidden, and immediately blanked it back out the moment it was set. */
  private clearHidden(stage: WorkflowStage) {
    if (!this.job) return;
    for (const f of stage.fields) {
      if (f.showIf) {
        const checkVal = f.showIf.key === 'inspectionType' ? stage.inspectionType
          : f.showIf.key === 'result' ? stage.result
          : stage.inputs[f.showIf.key];
        let visible = f.showIf.anyOf ? f.showIf.anyOf.includes(checkVal ?? '') : checkVal === f.showIf.equals;
        if (visible && f.showIf.and) {
          for (const cond of f.showIf.and) {
            const v = cond.key === 'result' ? stage.result : stage.inputs[cond.key];
            if (v !== cond.equals) { visible = false; break; }
          }
        }
        if (!visible && stage.inputs[f.key]) this.wfService.setStageInput(this.job, stage.id, f, '');
      }
    }
  }

  /* Consumable Insert: when Yes, auto-populate filler fields from fit stage consumable insert data and lock them */
  onConsumableInsertChange(stage: WorkflowStage, value: string) {
    if (!this.job || !this.wf) return;
    const field = stage.fields.find(f => f.key === 'consumableInsertOnly');
    if (field) this.wfService.setStageInput(this.job, stage.id, field, value);
    const fillerType = stage.fields.find(f => f.key === 'fillerMetalType');
    const fillerSize = stage.fields.find(f => f.key === 'fillerMetalSize');
    const fillerMic = stage.fields.find(f => f.key === 'fillerMetalMic');
    if (value !== 'yes') {
      /* unchecked: unlock and clear the filler fields so they must be re-entered */
      for (const f of [fillerType, fillerSize, fillerMic]) {
        if (f) this.wfService.setStageInput(this.job, stage.id, f, '');
      }
      return;
    }
    /* find the fit stage's consumable insert signoff data */
    const fitStage = this.wf().stages.find(s => s.id === 'fit');
    if (!fitStage) return;
    const consumableInsertType = fitStage.signoffInputs['consumableInsertType'] ?? '';
    const consumableInsertSize = fitStage.signoffInputs['consumableInsertSize'] ?? '';
    const consumableInsertId = fitStage.signoffInputs['consumableInsertId'] ?? '';
    /* auto-populate filler fields */
    if (fillerType && consumableInsertType) this.wfService.setStageInput(this.job, stage.id, fillerType, consumableInsertType);
    if (fillerSize && consumableInsertSize) this.wfService.setStageInput(this.job, stage.id, fillerSize, consumableInsertSize);
    if (fillerMic && consumableInsertId) this.wfService.setStageInput(this.job, stage.id, fillerMic, consumableInsertId);
  }

  /* 5X inspection dropdown: just records the answer. The corresponding 5X NDT stage is only
     auto-signed once THIS stage is itself signed off (see signStage()) — answering the question
     must never sign anything on its own. */
  on5xChange(stage: WorkflowStage, value: string) {
    if (!this.job) return;
    const field = stage.fields.find(f => f.key === 'performed5x');
    if (field) this.wfService.setStageInput(this.job, stage.id, field, value);
  }

  /* called right after `stage` itself is signed off: if it answered "yes" to the 5X question,
     auto-sign the matching VT/5X NDT stage now that the real sign-off has actually happened */
  private signRelated5xIfNeeded(stage: WorkflowStage) {
    if (!this.job || !this.wf) return;
    if (stage.id !== 'root-weld' || (stage.inputs['performed5x'] ?? '') !== 'yes') return;
    const ndtStage = this.wf().stages.find(s => s.id === 'root-ndt-vt5x');
    if (!ndtStage || ndtStage.signed) return;
    this.signoffService.signStage(this.job, 'root-ndt-vt5x', this.signoffSnapshot(ndtStage));
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
    if (next.length) this.clearFieldError(stage.id, 'affectedItem');
    this.wfService.setStageInput(this.job!, stage.id, { key: 'affectedItems', type: 'text' } as StageField, next.join(','));
  }
  /* select fields commit on change, clear maps to '' */
  stageSelectChange(stage: WorkflowStage, field: StageField, value: string | null) {
    const v = value ?? '';
    if (this.job && v !== (stage.inputs[field.key] ?? '')) {
      const changes: { field: StageField; value: string }[] = [{ field, value: v }];
      const setIfPresent = (key: string, val: string) => {
        const f = stage.fields.find(ff => ff.key === key);
        if (f) changes.push({ field: f, value: val });
      };
      let matchedProc = false;
      /* Filler Metal Type/Size are locked (not user-cleared) while "Only Consumable Insert used as
         filler" is checked -- see onConsumableInsertChange, which owns them in that case */
      const fillerFieldsLocked = stage.inputs['consumableInsertOnly'] === 'yes';
      if (field.key === 'weldProcedure') {
        /* GWP drives which WTNs are selectable; clear WTN and everything WTN used to drive */
        setIfPresent('wtn', '');
        setIfPresent('weldProcess', '');
        setIfPresent('phMin', ''); setIfPresent('phMax', ''); setIfPresent('ipMin', ''); setIfPresent('ipMax', '');
        setIfPresent('overridePhMin', ''); setIfPresent('overridePhMax', '');
        setIfPresent('overrideIpMin', ''); setIfPresent('overrideIpMax', ''); setIfPresent('overrideNote', '');
        /* an NC actual only existed because of the old requirement */
        for (const a of Object.keys(ACTUAL_REQUIREMENT)) if (stage.inputs[a] === 'NC') setIfPresent(a, '');
        if (!fillerFieldsLocked) { setIfPresent('fillerMetalType', ''); setIfPresent('fillerMetalSize', ''); }
      }
      if (field.key === 'wtn') {
        /* GWP+WTN identifies one Weld Engineering WPS document; it drives Weld Process,
           the PH/IP requirements and the override values -- never typed directly. Filler Metal
           Type/Size options narrow to this WPS too, but stay user-selected, so just clear any
           choice that's no longer valid under the new WPS. */
        const proc = getProcedureByGwpWtn(stage.inputs?.['weldProcedure'] ?? '', v);
        matchedProc = !!proc;
        setIfPresent('weldProcess', proc ? proc.weldProcess.toLowerCase() : '');
        setIfPresent('phMin', proc?.phMin ?? '');
        setIfPresent('phMax', proc?.phMax ?? '');
        setIfPresent('ipMin', proc?.ipMin ?? '');
        setIfPresent('ipMax', proc?.ipMax ?? '');
        /* NC requirement: actual is NC and locked; otherwise an NC left from the previous WTN is cleared */
        for (const [a, req] of Object.entries(ACTUAL_REQUIREMENT)) {
          if (proc?.[req as 'phMin'] === 'NC') setIfPresent(a, 'NC');
          else if (stage.inputs[a] === 'NC') setIfPresent(a, '');
        }
        const hasOv = SHOW_WELD_OVERRIDES && !!proc && procedureHasOverride(proc);
        setIfPresent('overridePhMin', hasOv ? proc!.overridePhMin : '');
        setIfPresent('overridePhMax', hasOv ? proc!.overridePhMax : '');
        setIfPresent('overrideIpMin', hasOv ? proc!.overrideIpMin : '');
        setIfPresent('overrideIpMax', hasOv ? proc!.overrideIpMax : '');
        setIfPresent('overrideNote', hasOv ? proc!.overrideNote : '');
        if (!fillerFieldsLocked && !this.offListUnlocked(stage)) {
          const currentType = stage.inputs['fillerMetalType'] ?? '';
          const currentSize = stage.inputs['fillerMetalSize'] ?? '';
          if (currentType && !fillerMetalTypeOptionsForProcedure(proc).some(o => o.value === currentType)) {
            setIfPresent('fillerMetalType', '');
          }
          if (currentSize && !fillerMetalSizeOptionsForProcedure(proc).some(o => o.value === currentSize)) {
            setIfPresent('fillerMetalSize', '');
          }
        }
      }
      this.wfService.setStageInputs(this.job, stage.id, changes);
      this.clearHidden(stage);
      if (field.key === 'wtn' && matchedProc) {
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
    this.clearFieldError(stage.id, '__decision');
    const old = stage.result;
    this.signoffService.updateStageSignoff(this.job, stage.id, { result },
      { action: `${stage.label} — ${stage.decisionLabel || 'Decision'}`, from: old ? old.toUpperCase() : '—', to: result.toUpperCase() });
  }

  /* generic signoff field blur handler */
  blurSignoffField(stage: WorkflowStage, field: SignoffField, value: string) {
    if (!this.job) return;
    if (value) this.clearFieldError(stage.id, field.key);
    const prev = stage.signoffInputs[field.key] ?? '';
    if (value === prev) return;
    this.signoffService.updateStageSignoff(this.job, stage.id,
      { signoffInputs: { ...stage.signoffInputs, [field.key]: value } },
      { action: `${stage.label} — ${field.label}`, from: this.show(prev), to: this.show(value) });
  }

  /* generic signoff field select change handler */
  signoffSelectChange(stage: WorkflowStage, field: SignoffField, value: string | null) {
    const v = value ?? '';
    if (!this.job) return;
    if (v) this.clearFieldError(stage.id, field.key);
    const prev = stage.signoffInputs[field.key] ?? '';
    if (v === prev) return;
    this.signoffService.updateStageSignoff(this.job, stage.id,
      { signoffInputs: { ...stage.signoffInputs, [field.key]: v } },
      { action: `${stage.label} — ${field.label}`, from: this.show(prev), to: this.show(v) });
  }

  /* generic signoff checkbox change handler */
  signoffCheckboxChange(stage: WorkflowStage, field: SignoffField, checked: boolean) {
    const v = checked ? 'yes' : '';
    if (!this.job) return;
    const prev = stage.signoffInputs[field.key] ?? '';
    if (v === prev) return;
    this.signoffService.updateStageSignoff(this.job, stage.id,
      { signoffInputs: { ...stage.signoffInputs, [field.key]: v } },
      { action: `${stage.label} — ${field.label}`, from: this.show(prev), to: this.show(v) });
  }

  /* visibility of a signoff field (showIf support) */
  visibleSignoffFields(stage: WorkflowStage): SignoffField[] {
    return stage.signoffFields.filter(f => {
      if (f.showIf && stage.signoffInputs[f.showIf.key] !== f.showIf.equals) return false;
      // For fit/pre-fit, hide consumable insert and backing ring fields when not required
      if (stage.id === 'fit' || stage.id === 'pre-fit') {
        const isConsumableInsert = ['consumableInsertType', 'consumableInsertSize', 'consumableInsertId'].includes(f.key);
        const isBackingRing = ['backingRingType', 'backingRingId'].includes(f.key);
        if (isConsumableInsert && !this.jointDesignRequiresInsert()) return false;
        if (isBackingRing && !this.jointDesignRequiresBackingRing()) return false;
      }
      return true;
    });
  }
  /* ── inline field validation ── */
  private validateStageFields(stage: WorkflowStage): Record<string, string> {
    const errors: Record<string, string> = {};
    const fields = stage.fields ?? [];
    const visible = this.visibleFields(stage);
    const visibleKeys = new Set(visible.map(f => f.key));
    for (const f of fields) {
      if (f.key === 'comments') continue;
      if (!visibleKeys.has(f.key)) continue;
      const val = stage.inputs?.[f.key];
      const empty = val === undefined || val === null || val === '';
      if (f.required && empty) {
        errors[`${stage.id}:${f.key}`] = `${f.label} is required`;
      }
      /* Actual PH/IP out of range isn't an error: it's a deviation (fieldWarning, detectDeviations) */
    }
    for (const pair of ACTUAL_MIN_MAX) {
      const err = visibleKeys.has(pair.max) ? actualOrderError(stage.inputs ?? {}, pair) : '';
      if (err && !errors[`${stage.id}:${pair.max}`]) errors[`${stage.id}:${pair.max}`] = err;
    }
    /* Fit-Up Insp: every verification checkbox must be checked -- signBlockers() already blocks
       signoff with one summary reason ("Verify every fitting value"); this adds a per-field error
       so the specific unchecked row(s) can be highlighted, same as any other required field. */
    if (stage.id === 'fitup-insp') {
      for (const f of visible) {
        if (stage.inputs?.[f.key] !== 'yes') {
          errors[`${stage.id}:${f.key}`] = `${f.label} must be verified`;
        }
      }
    }
    /* Weld build-up: affectedItems + micVerified */
    if (stage.id === 'fit' && stage.routingType === 'weld-buildup') {
      const raw = stage.inputs?.['affectedItems'] ?? '';
      const items = raw ? raw.split(',') : [];
      if (!items.length) {
        errors[`${stage.id}:affectedItem`] = 'Select at least one Affected Item';
      }
      /* MIC verified is only shown (and so only required) when that item's MCL requires
         traceability -- same condition signoff-panel.component.ts uses to render the checkbox. */
      if (items.includes('joiningItem') && requiresTraceability(this.job?.mcl1 ?? '') && stage.inputs?.['micVerified1'] !== 'yes') {
        errors[`${stage.id}:affectedItem`] = 'Please verify MIC for ' + (this.job?.joiningItem || 'item');
      }
      if (items.includes('joinToItem') && requiresTraceability(this.job?.mcl2 ?? '') && stage.inputs?.['micVerified2'] !== 'yes') {
        errors[`${stage.id}:affectedItem`] = 'Please verify MIC for ' + (this.job?.joinToItem || 'item');
      }
    }
    /* Decision, Type and Routing Type -- same conditions signBlockers() uses, kept in sync via
       synthetic keys (no real StageField backs these) so they highlight red like any other
       required field instead of only appearing in signBlockers()' un-displayed reason list. */
    if (stage.rejectToStage && !stage.result) {
      errors[`${stage.id}:__decision`] = 'Choose SAT or UNSAT';
    }
    if (this.inspectionTypeRequired(stage) && !stage.inspectionType) {
      errors[`${stage.id}:__inspectionType`] = 'Select the inspection performed';
    }
    if (stage.repeatable && !stage.routingType) {
      errors[`${stage.id}:__routingType`] = 'Choose the routing type';
    }
    /* Fit: fabrication data must have Location, MIC 1, MIC 2, Drawing Rev, Actual Thickness --
       highlighting for these lives on the Fabrication panel itself (fabErrors(), always live, not
       gated to a signoff attempt); this only needs to block signing via the errors-length check. */
    if (stage.id === 'fit' && Object.keys(this.fabErrors()).length > 0) {
      errors[`${stage.id}:__fabrication`] = 'Fix the fabrication errors';
    }
    /* Required signoff fields (e.g. Fit/Pre-Fit's Consumable Insert/Backing Ring, or any other
       stage's required signoffFields) -- same rules signBlockers() uses (requiredSignoffFields()). */
    for (const f of this.requiredSignoffFields(stage)) {
      if ((stage.signoffInputs[f.key] ?? '').trim().length === 0) {
        errors[`${stage.id}:${f.key}`] = `${f.label} is required`;
      }
    }
    /* RT NDT: Degree of RT Performed must match the job's required degree -- same condition
       signBlockers() uses. */
    if (stage.inspectionType === 'rt') {
      const required = this.rtDegreeRequired(stage);
      if (required && stage.inputs['degreeRt'] !== required) {
        errors[`${stage.id}:degreeRt`] = `Degree of RT Performed must be ${required}`;
      }
    }
    return errors;
  }

  /** Called on blur of a single field — validates required + Actual Min/Max order */
  onFieldBlur(stage: WorkflowStage, field: StageField) {
    const key = `${stage.id}:${field.key}`;
    /* read current values from live signal (stage param may be stale) */
    const curStage = this.wf ? this.wf().stages.find(s => s.id === stage.id) : undefined;
    const val = curStage?.inputs?.[field.key];
    const empty = val === undefined || val === null || val === '';
    const prev = { ...this.fieldErrors() };
    delete prev[key];
    /* required check on blur */
    if (field.required && empty) {
      prev[key] = `${field.label} is required`;
    }
    /* Actual Min above Max: flagged on the Max field, rechecked when either one changes */
    const pair = ACTUAL_MIN_MAX.find(p => p.min === field.key || p.max === field.key);
    if (pair) {
      const maxKey = `${stage.id}:${pair.max}`;
      const err = actualOrderError(curStage?.inputs ?? {}, pair);
      const orderMsg = `${pair.maxLabel} is below ${pair.minLabel}`;
      if (err && !prev[maxKey]) prev[maxKey] = err;
      if (!err && prev[maxKey] === orderMsg) delete prev[maxKey];
    }
    this.fieldErrors.set(prev);
  }

  fieldError(stageId: string, fieldKey: string): string | undefined {
    return this.fieldErrors()[`${stageId}:${fieldKey}`];
  }

  /* clears one field's error the moment its value changes, so a red highlight from a failed
     signoff attempt (e.g. Fit-Up Insp's unchecked verification boxes) doesn't linger after it's fixed */
  clearFieldError(stageId: string, fieldKey: string) {
    const key = `${stageId}:${fieldKey}`;
    const prev = this.fieldErrors();
    if (prev[key]) {
      const next = { ...prev };
      delete next[key];
      this.fieldErrors.set(next);
    }
  }

  /* What History records for a sign-off: every editable field the user was shown, with its value right now
     (blanks included). Read from the live workflow, since the stage object a click handler holds can be stale. */
  private signoffSnapshot(stage: WorkflowStage): SignoffInput[] {
    const st = this.wf?.().stages.find(s => s.id === stage.id) ?? stage;
    const out = snapshotInputs(st, this.visibleFields(st), this.visibleSignoffFields(st));
    if (st.id === 'fit' && st.routingType === 'weld-buildup' && this.job) {
      const names = (st.inputs['affectedItems'] ?? '').split(',').filter(Boolean).map(k => this.job![k as 'joiningItem' | 'joinToItem']);
      out.push({ label: 'Affected Item', value: names.join(', ') });
    }
    return out;
  }

  signStage(stage: WorkflowStage) {
    if (!this.job || this.heldAt(stage)) return;
    /* validate required fields + range constraints */
    const errors = this.validateStageFields(stage);
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) { this.focusFirstError(); return; }
    if (!this.canSignStage(stage)) return;
    /* Interim Layer goes through the same signoff; SignoffService keeps Layer as the current routing */
    const routingNote = stage.repeatable && stage.routingType === 'repeat'
      ? ' Another round will be added after this one.'
      : '';
    const st = this.wf?.().stages.find(s => s.id === stage.id) ?? stage;
    const deviations = this.stageDeviations(st);
    if (deviations.length) {
      this.deviationRequest.set({ stage: st, stageLabel: st.label, items: deviations, routingNote });
      return;
    }
    this.confirm.confirm({
      header: 'Confirm sign-off',
      message: `By signing, I certify that all recorded values are accurate and the work has been performed in accordance with applicable standards.${routingNote}`,
      acceptLabel: 'Signoff',
      rejectLabel: 'Cancel',
      password: true,
      accept: () => {
        this.signoffService.signStage(this.job!, stage.id, this.signoffSnapshot(stage));
        this.signRelated5xIfNeeded(stage);
        this.router.navigate([this.backDestination()]);
      }
    });
  }
  reopenStage(stage: WorkflowStage) {
    if (!this.job) return;
    this.signoffService.reopenStage(this.job, stage.id);
    const idx = this.wf!().stages.findIndex(s => s.id === stage.id);
    if (idx >= 0) this.selectedRouting.set(idx);
  }

  // ---- attachments ----
  addAttachments(files: FileList) {
    if (!this.job) return;
    for (const f of Array.from(files)) this.attachmentService.addAttachment(this.job, f.name);
  }
  removeAttachment(id: string) {
    if (this.job) this.attachmentService.removeAttachment(this.job, id);
  }

  /* code description, shown on hover */
  codeLabel(code: string): string { return characteristicLabel(code); }

  /* fabrication data input handlers */
  fabInputBlur(key: string, value: string) {
    if (this.job && this.wf && value !== (this.wf().fabricationData[key] ?? '')) {
      this.fabricationService.setFabricationData(this.job, key, value);
    }
  }
  fabSelectChange(key: string, value: string | null) {
    const v = value ?? '';
    if (this.job && this.wf && v !== (this.wf().fabricationData[key] ?? '')) {
      this.fabricationService.setFabricationData(this.job, key, v);
    }
  }

  /* routing option / inspection type handlers */
  setInspectionType(value: string) {
    if (!this.job || !this.wf) return;
    const idx = this.selectedRouting();
    const stage = this.wf().stages[idx];
    if (!stage) return;
    if (value) this.clearFieldError(stage.id, '__inspectionType');
    this.wf.update(wf => ({
      ...wf,
      stages: wf.stages.map((s, i) => i === idx ? { ...s, inspectionType: value } : s)
    }));
  }

  /* where "Back"/post-signoff navigation returns to, based on how this screen was opened */
  private backDestination(): string {
    const from = this.route.snapshot.queryParamMap.get('from');
    if (from === 'assignments') return '/assignments';
    if (from === 'history') return '/history';
    return '/pipe-search';
  }

  back() {
    this.router.navigate([this.backDestination()]);
  }

}
