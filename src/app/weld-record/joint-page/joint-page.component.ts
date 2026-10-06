//This is the job details page

/* The joint page: page state, wiring to the sign-off panel, and the actions that save through the
   weld-record services. The form rules live in data/joint-form/, the override state in
   JointOverridesService. */
import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmService } from '../../shared/confirm.service';
import { RoutingBarComponent } from '../routing-bar/routing-bar.component';
import { JointDetailsComponent } from '../joint-details/joint-details.component';
import { AttachmentsComponent } from '../attachments/attachments.component';
import { FabricationComponent } from '../fabrication/fabrication.component';
import { SignoffPanelComponent } from '../signoff-panel/signoff-panel.component';
import { SignoffContext } from '../signoff-panel/signoff-context';
import { DeviationAcceptDialogComponent, DeviationAcceptRequest } from '../deviation-dialog/deviation-accept-dialog.component';
import { JointOverridesService } from './joint-overrides.service';

import { JOBS, Job } from '../../data/jobs';
import { RoutingService } from '../services/routing.service';
import { SignoffService } from '../services/signoff.service';
import { AttachmentService } from '../services/attachment.service';
import { FabricationDataService } from '../services/fabrication-data.service';
import { DeviationService } from '../services/deviation.service';
import { WeldAssignmentService } from '../services/weld-assignment.service';
import { WorkflowStore } from '../services/workflow-store.service';
import {
  WorkflowStage, StageField, SignoffField, StageResult, STAGE_RESULT_OPTIONS, isStageLocked, currentRoutingLabel,
  activeStageId, allRequiredSigned, getTemplates, FabricationField, snapshotInputs, SignoffInput,
  ACTUAL_REQUIREMENT, HistoryRow, historyRows, inspectionTypeRequired, discardUnsignedEdits, fabricationEditable, isEngineeringHoldId, showsReferences, show,
} from '../../data/workflow';
import { loadFeatureToggles } from '../../data/feature-toggles';
import { inspectionProcedureOptions } from '../../data/inspection-procedures';
import { formatDate } from '../../shared/date-format';
import { fabricationErrors, fabricationFieldRequired, fabricationFieldsShown } from '../../data/joint-form/fabrication-form';
import { jointDesignRequiresBackingRing, jointDesignRequiresInsert, visibleSignoffFields } from '../../data/joint-form/fit-signoff';
import {
  REQUIREMENT_KEYS, StageFormContext, hiddenFieldsWithValues, startsGroup, visibleStageFields, fitFieldsForType,
} from '../../data/joint-form/stage-form';
import { consumableInsertFill, selectChangeCascade, typedRequirementChanges } from '../../data/joint-form/weld-cascade';
import { SignContext, errorsAfterBlur, errorsAfterSelect, signProblems, stageFieldErrors } from '../../data/joint-form/sign-validation';
import { fitupVerifyValue, reviewVerifyValue } from '../../data/joint-form/verify-values';
import { routePreviewLabel } from '../../data/joint-form/route-preview';
import { LoadedJoint, captureLoaded, hasUnsavedEdits, rebaselineAfterSignoff } from '../../data/joint-form/unsaved-edits';

@Component({
  selector: 'app-joint-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RoutingBarComponent, JointDetailsComponent, AttachmentsComponent, FabricationComponent, SignoffPanelComponent,
    DeviationAcceptDialogComponent
  ],
  providers: [JointOverridesService],
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
  private weldAssignment = inject(WeldAssignmentService);
  private confirm = inject(ConfirmService);
  private overrides = inject(JointOverridesService);

  job: Job | undefined = JOBS.find(j => j.id === this.route.snapshot.paramMap.get('id'));
  wf = this.job ? this.store.workflowFor(this.job) : null;

  /* snapshot of state as loaded, so unsigned/unsaved edits (Fab data, stage inputs, sign-off
     fields, routing type choice) can be discarded when the user leaves without signing */
  private readonly loadSnapshot = this.wf ? this.assignAndSnapshot() : null;

  constructor() {
    if (this.job && this.wf && this.loadSnapshot) {
      const wf = this.wf;
      this.overrides.init({ job: this.job, wf: () => wf(), loaded: this.loadSnapshot, visibleFields: s => this.visibleFields(s) });
    }
  }

  /* the external system's GWP/WTN/filler go on before the snapshot, so they aren't an unsaved edit */
  private assignAndSnapshot(): LoadedJoint {
    if (this.job) this.weldAssignment.applyAll(this.job);
    return captureLoaded(this.wf!());
  }

  /* the leave-page guard: false when something typed this visit would be lost */
  canDeactivate(): boolean {
    if (!this.wf || !this.loadSnapshot) return true;
    return !this.overrides.hasReported() && !hasUnsavedEdits(this.wf(), this.loadSnapshot, s => this.overrides.engineeringEdits(s));
  }

  /* Discard any unsigned/unsaved Fab and sign-off edits made this visit, so re-entering the
     joint later doesn't hold onto data that was never signed off. */
  ngOnDestroy() {
    if (!this.job || !this.wf || !this.loadSnapshot) return;
    const snapshot = this.loadSnapshot;
    const pending = this.overrides.pendingEngineering(this.wf().stages);
    this.wf.update(wf => discardUnsignedEdits(wf, snapshot));
    /* engineering doesn't sign: its override is kept, not discarded */
    for (const p of pending) this.overrides.recordEngineering(p.stage, p.values);
  }

  /* ── Page state ── */

  /* routing model: only show stages that are signed, required, or the current active stage */
  routingModel = computed<{ label: string; disabled: boolean; stageIndex: number }[]>(() => {
    if (!this.wf) return [];
    const stages = this.wf().stages;
    /* the current routing, not the first unsigned step (a deferred Tack is unsigned but skipped) */
    const activeIdx = stages.findIndex(s => s.id === activeStageId(stages));
    return stages
      .map((s, i) => ({ label: s.displayName || s.label, disabled: this.locked(i), signed: s.signed, required: s.required, stageIndex: i }))
      .filter(s => s.signed || s.required || s.stageIndex === activeIdx)
      .map(s => ({ label: s.label, disabled: s.disabled, stageIndex: s.stageIndex }));
  });
  /* which stage's sign-off shows; defaults to active */
  selectedRouting = signal<number>(this.indexOfActive());
  /* inline field validation errors: key = `${stageId}:${fieldKey}` */
  fieldErrors = signal<Record<string, string>>({});

  currentRouting = computed(() => (this.wf ? currentRoutingLabel(this.wf().stages) : ''));
  /* done when all required stages signed */
  jobComplete = computed(() => (this.wf ? allRequiredSigned(this.wf().stages) : false));
  soldSigned = computed(() => !!this.wf?.().stages.some(s => s.id === 'sold' && s.signed));
  /* fabrication fields locked unless the current step has Fabrication editable (Admin > Routing Settings) */
  fabLocked = computed(() => !!this.wf && !!this.job && !fabricationEditable(this.job.trade, this.wf().stages));
  /* id of stage awaiting sign-off, null when done */
  activeStage = computed(() => (this.wf ? activeStageId(this.wf().stages) : null));
  rejectedCount = computed(() =>
    this.wf ? this.wf().stages.filter(s => s.signed && s.result === 'unsat').length : 0);

  /* the joint's History rows, as the History screen shows them (Records Review) */
  history = computed<HistoryRow[]>(() => (this.wf ? historyRows(this.wf(), this.job) : []));

  /* which steps show References: see showsReferences() in data/workflow/stage-rules.ts */
  showReferences = computed(() => !!this.wf && showsReferences(this.wf().stages[this.selectedRouting()]?.id ?? ''));

  /* first unsigned required stage, or last when done */
  private indexOfActive(): number {
    if (!this.wf) return 0;
    const stages = this.wf().stages;
    const idx = stages.findIndex(s => s.id === activeStageId(stages));
    return idx === -1 ? Math.max(0, stages.length - 1) : idx;
  }

  private fab(): Record<string, string> {
    return this.wf ? this.wf().fabricationData : {};
  }

  /* ── Fabrication panel ── */

  /* rebuilt each read so Location options stay fresh */
  fabFields = computed(() => fabricationFieldsShown(this.job, this.fab()));
  fabErrors = computed(() => (this.wf ? fabricationErrors(this.job, this.fab()) : {}));
  fabFieldRequired = (f: FabricationField): boolean => !!this.wf && fabricationFieldRequired(f, this.fab());

  fabInputBlur(key: string, value: string) {
    if (this.job && this.wf && value !== (this.fab()[key] ?? '')) {
      this.fabricationService.setFabricationData(this.job, key, value);
    }
  }
  fabSelectChange(key: string, value: string | null) {
    this.fabInputBlur(key, value ?? '');
  }

  /* ── What can be edited ── */

  /* locked until prior required stages signed */
  locked(i: number): boolean {
    return this.wf ? isStageLocked(this.wf().stages, i) : true;
  }
  /* sign-off editable only on the active stage */
  editable(stage: WorkflowStage): boolean {
    return stage.required && !stage.signed && stage.id === this.activeStage() && !this.soldSigned() && !this.heldAt(stage);
  }
  /* inputs editable on active or unlocked optional stage */
  inputsEditable(stage: WorkflowStage, i: number): boolean {
    return !stage.signed && !this.locked(i) && !this.soldSigned() && !this.heldAt(stage);
  }

  /* ── Engineering Hold ── */

  /* the acceptance screen Signoff opens when the stage has deviations */
  deviationRequest = signal<(DeviationAcceptRequest & { stage: WorkflowStage }) | null>(null);

  private openDeviations = computed(() => (this.wf ? this.deviationService.openDeviations(this.wf()) : []));
  holdNote = computed(() => {
    const d = this.openDeviations()[0];
    const hold = this.wf?.().stages.find(s => s.id === this.activeStage() && isEngineeringHoldId(s.id));
    if (!d && hold?.inputs['holdReason']) {
      return `On Engineering Hold: ${hold.inputs['holdReason']}. No later step can be signed until Engineering sets the routing on the Engineering Hold step.`;
    }
    if (!d) return '';
    const when = formatDate(d.when);
    return `On Engineering Hold: a deviation was accepted at ${d.stageLabel} on ${when}. No later step can be signed until Engineering sets the routing on the Engineering Hold step.`;
  });
  /* an open deviation holds every step except the one it was accepted on, which can still be re-signed after a deprogress */
  private heldAt(stage: WorkflowStage): boolean {
    const open = this.openDeviations();
    return open.length > 0 && !open.some(d => d.stageId === stage.id);
  }

  acceptDeviations(reason: string) {
    const req = this.deviationRequest();
    this.deviationRequest.set(null);
    if (!req || !this.job) return;
    this.deviationService.record(this.job, req.stage.id, req.items, reason);
    this.overrides.recordOverrides(req.stage);
    this.sign(req.stage.id, this.signoffSnapshot(req.stage), true);
    /* no 5X auto-sign: the joint is now on Engineering Hold */
    this.router.navigate([this.backDestination()]);
  }

  /* ── The sign-off panel ── */

  signoffCtx = computed<SignoffContext | null>(() => {
    if (!this.job || !this.wf) return null;
    const w = this.wf();
    const job = this.job;
    const ov = this.overrides;
    return {
      job,
      wf: () => ({ stages: w.stages, fabricationData: w.fabricationData }),
      history: () => this.history(),
      selectedRouting: () => this.selectedRouting(),
      jobComplete: () => this.jobComplete(),
      soldSigned: () => this.soldSigned(),
      fabLocked: () => this.fabLocked(),
      rejectedCount: () => this.rejectedCount(),
      resultOptions: STAGE_RESULT_OPTIONS,
      fabErrors: () => this.fabErrors(),
      fieldErrors: () => this.fieldErrors(),
      editable: (s) => this.editable(s),
      inputsEditable: (s, i) => this.inputsEditable(s, i),
      canSignStage: (s) => this.canSignStage(s),
      visibleFields: (s) => this.visibleFields(s),
      visibleSignoffFields: (s) => this.visibleSignoffFields(s),
      startsGroup: (s, f) => startsGroup(s, f),
      fieldError: (sid, fk) => this.fieldError(sid, fk),
      clearFieldError: (sid, fk) => this.clearFieldError(sid, fk),
      getFabValue: (k) => fitupVerifyValue(k, job, this.fab()),
      getReviewValue: (k) => reviewVerifyValue(k, job),
      fabFieldRequired: (f) => this.fabFieldRequired(f),
      inspectionTypeRequired: (s) => inspectionTypeRequired(s),
      jointDesignRequiresInsert: () => jointDesignRequiresInsert(job, this.fab()),
      jointDesignRequiresBackingRing: () => jointDesignRequiresBackingRing(job, this.fab()),
      hasOverrideFields: (s) => this.visibleFields(s).some(f => f.key.startsWith('override')),
      routePreviewLabel: (s) => this.routePreviewLabel(s),
      holdNote: () => this.holdNote(),
      leaveAfterSignoff: () => this.router.navigate([this.backDestination()]),
      fieldWarning: (s, k) => ov.fieldWarning(s, k),
      reportedDeviations: (s) => ov.reported()[s.id] ?? [],
      foremanOverride: (s) => ov.foremanOverride(s),
      engineeringOverrideAvailable: (s) => ov.engineeringOverrideAvailable(s),
      engineeringOverride: (s) => ov.engineeringOverrideClick(s),
      removeForemanOverride: (s, i) => ov.removeForemanOverride(s, i),
      assignedLocked: (s, k) => ov.assignedLocked(s, k),
      stageInputBlur: (s, f, v) => this.stageInputBlur(s, f, v),
      stageSelectChange: (s, f, v) => this.stageSelectChange(s, f, v),
      blurSignoffField: (s, f, v) => this.setSignoffInput(s, f, v),
      signoffSelectChange: (s, f, v) => this.setSignoffInput(s, f, v ?? ''),
      signoffCheckboxChange: (s, f, c) => this.setSignoffInput(s, f, c ? 'yes' : '', false),
      toggleAffectedItem: (s, item, e) => this.toggleAffectedItem(s, item, e),
      onConsumableInsertChange: (s, v) => this.onConsumableInsertChange(s, v),
      on5xChange: (s, v) => this.setInput(s, 'performed5x', v),
      updateRoutingType: (s, v) => this.updateRoutingType(s, v),
      setInspectionType: (v) => this.setInspectionType(v),
      setStageResult: (s, r) => this.setStageResult(s, r),
      signStage: (s) => this.signStage(s),
      deprogress: (reason) => this.deprogress(reason),
    };
  });

  private formCtx(stage: WorkflowStage): StageFormContext {
    return { job: this.job, stages: this.wf?.().stages ?? [], offListUnlocked: this.overrides.offListUnlocked(stage) };
  }

  visibleFields(stage: WorkflowStage): StageField[] {
    return visibleStageFields(stage, this.formCtx(stage));
  }

  visibleSignoffFields(stage: WorkflowStage): SignoffField[] {
    return visibleSignoffFields(stage, this.job, this.fab());
  }

  /* ── Routing preview ── */

  /* the demo routing preview under the Signoff button (route-preview.ts) */
  private routingPreviewOn = loadFeatureToggles().routingPreview;
  routePreviewLabel(stage: WorkflowStage): string {
    if (!this.routingPreviewOn || !this.job || !this.wf) return '';
    const wf = this.wf();
    const job = this.job;
    const hold = () => this.overrides.stageDeviations(stage).length > 0;
    return routePreviewLabel(job, wf.stages, stage, this.activeStage(),
      result => this.signoffService.previewSignoff(wf, job, stage.id, result, hold()));
  }

  /* ── Step inputs ── */

  private setInput(stage: WorkflowStage, key: string, value: string) {
    const field = stage.fields.find(f => f.key === key);
    if (this.job && field) this.wfService.setStageInput(this.job, stage.id, field, value);
  }

  /* blank any dependent field whose trigger no longer matches */
  private clearHidden(stage: WorkflowStage) {
    if (!this.job) return;
    const hidden = hiddenFieldsWithValues(stage);
    if (hidden.length) this.wfService.setStageInputs(this.job, stage.id, hidden.map(field => ({ field, value: '' })));
  }

  stageInputBlur(stage: WorkflowStage, field: StageField, value: string) {
    if (stage.engineeringEntry && REQUIREMENT_KEYS.has(field.key)) {
      this.typedRequirementBlur(stage, field, value);
      return;
    }
    if (this.job && value !== (stage.inputs[field.key] ?? '')) {
      const job = this.job;
      this.overrides.engineeringEdit(stage, field, value, () => {
        this.wfService.setStageInput(job, stage.id, field, value);
        this.clearHidden(stage);
      });
    }
    this.onFieldBlur(stage, field);
    /* clear required error if now filled */
    if (field.required && value && this.fieldErrors()[`${stage.id}:${field.key}`]?.endsWith('is required')) {
      this.clearFieldError(stage.id, field.key);
    }
  }

  /* a typed PH/IP requirement (engineering override); see typedRequirementChanges */
  private typedRequirementBlur(stage: WorkflowStage, field: StageField, raw: string) {
    if (!this.job) return;
    const changes = typedRequirementChanges(stage, field, raw);
    if (changes.length) {
      const job = this.job;
      this.overrides.engineeringEdit(stage, field, changes[0].value, () => this.wfService.setStageInputs(job, stage.id, changes));
    }
    this.onFieldBlur(stage, field);
  }

  /* select fields commit on change, clear maps to '' */
  stageSelectChange(stage: WorkflowStage, field: StageField, value: string | null) {
    const v = value ?? '';
    if (this.job && v !== (stage.inputs[field.key] ?? '')) {
      const { changes, matchedProc } = selectChangeCascade(stage, field, v, this.overrides.offListUnlocked(stage));
      const job = this.job;
      this.overrides.engineeringEdit(stage, field, v, () => this.wfService.setStageInputs(job, stage.id, changes));
      this.clearHidden(stage);
      /* the WTN filled in Weld Process */
      if (field.key === 'wtn' && matchedProc) this.clearFieldError(stage.id, 'weldProcess');
    }
    const live = this.wf?.().stages.find(s => s.id === stage.id);
    this.fieldErrors.set(errorsAfterSelect(this.fieldErrors(), live, this.job, stage.id, field.key));
  }

  toggleAffectedItem(stage: WorkflowStage, item: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const raw = stage.inputs['affectedItems'] ?? '';
    const current = raw ? raw.split(',') : [];
    const next = checked ? [...current, item] : current.filter(i => i !== item);
    if (next.length) this.clearFieldError(stage.id, 'affectedItem');
    this.wfService.setStageInput(this.job!, stage.id, { key: 'affectedItems', type: 'text' } as StageField, next.join(','));
  }

  /* Consumable Insert: when Yes, fill the filler fields from Fit's Consumable Insert and lock them */
  onConsumableInsertChange(stage: WorkflowStage, value: string) {
    if (!this.job || !this.wf) return;
    this.setInput(stage, 'consumableInsertOnly', value);
    if (value === 'yes') {
      const fill = consumableInsertFill(stage, this.wf().stages.find(s => s.id === 'fit'));
      if (fill.length) this.wfService.setStageInputs(this.job, stage.id, fill);
      return;
    }
    /* unchecked: MIC must be re-entered; Type/Size go back to the external system's values,
       or blank under a Foreman Override or engineering override */
    this.setInput(stage, 'fillerMetalMic', '');
    if (!this.overrides.offListUnlocked(stage) && !stage.engineeringEntry) { this.weldAssignment.apply(this.job, stage.id); return; }
    this.setInput(stage, 'fillerMetalType', '');
    this.setInput(stage, 'fillerMetalSize', '');
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
    /* a procedure not designated for the new Type is cleared */
    const proc = stage.inputs['procedureUsed'] ?? '';
    if (proc && !inspectionProcedureOptions(value).some(o => o.value === proc)) this.setInput(stage, 'procedureUsed', '');
  }

  updateRoutingType(stage: WorkflowStage, value: string) {
    if (!this.job || !this.wf) return;
    if (value) this.clearFieldError(stage.id, '__routingType');
    const change = { action: `${stage.label} - Type changed to ${value}` };
    if (stage.id !== 'fit') {
      this.signoffService.updateStageSignoff(this.job, stage.id, { routingType: value }, change);
      return;
    }
    /* Fit: Weld Build-Up swaps in Tack's fields and drops the sign-off fields; Fit puts its own back */
    const fitTpl = (getTemplates()[this.job.trade] ?? []).find(t => t.id === 'fit');
    const buildup = value === 'weld-buildup';
    this.signoffService.updateStageSignoff(this.job, stage.id, {
      routingType: value,
      fields: fitFieldsForType(this.job.trade, value),
      signoffInputs: {},
      signoffFields: buildup ? [] : (fitTpl?.signoffFields ?? []).map(f => ({ ...f })),
    }, change);
    if (buildup) this.weldAssignment.apply(this.job, stage.id);
  }

  /* ── Sign-off fields ── */

  setStageResult(stage: WorkflowStage, result: StageResult) {
    if (!this.job || result === stage.result) return;
    this.clearFieldError(stage.id, '__decision');
    const old = stage.result;
    this.signoffService.updateStageSignoff(this.job, stage.id, { result },
      { action: `${stage.label} - ${stage.decisionLabel || 'Decision'}`, from: old ? old.toUpperCase() : '-', to: result.toUpperCase() });
  }

  /* a sign-off field's new value (text blur, select or checkbox); a value clears that field's error */
  private setSignoffInput(stage: WorkflowStage, field: SignoffField, value: string, clearsError = true) {
    if (!this.job) return;
    if (clearsError && value) this.clearFieldError(stage.id, field.key);
    const prev = stage.signoffInputs[field.key] ?? '';
    if (value === prev) return;
    this.signoffService.updateStageSignoff(this.job, stage.id,
      { signoffInputs: { ...stage.signoffInputs, [field.key]: value } },
      { action: `${stage.label} - ${field.label}`, from: show(prev), to: show(value) });
  }

  /* ── Validation ── */

  private signCtx(stage: WorkflowStage): SignContext {
    return { job: this.job, fab: this.fab(), fabErrors: this.fabErrors(), visibleFields: this.visibleFields(stage) };
  }

  /* Everything currently preventing this stage from being signed, in reader-friendly wording. */
  signBlockers(stage: WorkflowStage): string[] {
    if (this.heldAt(stage)) return ['On hold for an open deviation'];
    if (!this.editable(stage)) return ['Earlier routing must be signed off first'];
    return signProblems(stage, this.signCtx(stage));
  }

  canSignStage(stage: WorkflowStage): boolean {
    return this.signBlockers(stage).length === 0;
  }

  /* Called on blur of a single field: validates required + Actual Min/Max order. Reads the live
     stage, since the stage param may be stale. */
  onFieldBlur(stage: WorkflowStage, field: StageField) {
    const live = this.wf?.().stages.find(s => s.id === stage.id);
    this.fieldErrors.set(errorsAfterBlur(this.fieldErrors(), live, stage.id, field));
  }

  fieldError(stageId: string, fieldKey: string): string | undefined {
    /* an actual set to NC by its requirement has nothing to check; drops an error left from an
       earlier Signoff attempt, before the WTN made it NC */
    if (fieldKey in ACTUAL_REQUIREMENT && this.wf?.().stages.find(s => s.id === stageId)?.inputs[fieldKey] === 'NC') return undefined;
    return this.fieldErrors()[`${stageId}:${fieldKey}`];
  }

  /* clears one field's error the moment its value changes, so a red highlight from a failed
     signoff attempt (e.g. Fit-Up Insp's unchecked verification boxes) doesn't linger after it's fixed */
  clearFieldError(stageId: string, fieldKey: string) {
    const key = `${stageId}:${fieldKey}`;
    const prev = this.fieldErrors();
    if (!prev[key]) return;
    const next = { ...prev };
    delete next[key];
    this.fieldErrors.set(next);
  }

  /* after a failed sign attempt: bring the first validation error into view and focus its field */
  private focusFirstError() {
    setTimeout(() => {
      const err = document.querySelector('.signoff-panel .field-error');
      if (!err) return;
      err.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (err.parentElement?.querySelector('input, select') as HTMLElement | null)?.focus({ preventScroll: true });
    });
  }

  /* ── Signing ── */

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
    const errors = stageFieldErrors(stage, this.signCtx(stage));
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) { this.focusFirstError(); return; }
    if (!this.canSignStage(stage)) return;
    /* Interim Layer goes through the same signoff; SignoffService keeps Layer as the current routing */
    const routingNote = stage.repeatable && stage.routingType === 'repeat'
      ? ' Another round will be added after this one.'
      : '';
    const st = this.wf?.().stages.find(s => s.id === stage.id) ?? stage;
    const deviations = this.overrides.stageDeviations(st);
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
        this.overrides.recordOverrides(st);
        this.sign(stage.id, this.signoffSnapshot(stage));
        this.signRelated5xIfNeeded(stage);
        this.router.navigate([this.backDestination()]);
      }
    });
  }

  /* signs, then counts what the sign-off changed (a route-back, a Cut) as loaded, so the leave guard doesn't call it unsaved */
  private sign(stageId: string, inputs: SignoffInput[], engineeringHold = false) {
    if (!this.job || !this.wf) return;
    const before = this.wf();
    this.signoffService.signStage(this.job, stageId, inputs, engineeringHold);
    if (this.loadSnapshot) rebaselineAfterSignoff(this.loadSnapshot, before, this.wf());
  }

  /* Records Review's Deprogress: undoes the latest sign-off, which the leave guard counts as loaded
     (as after signing), and shows the step the joint is now at */
  private deprogress(reason: string) {
    if (!this.job || !this.wf) return;
    const before = this.wf();
    this.wfService.deprogress(this.job, reason);
    if (this.loadSnapshot) rebaselineAfterSignoff(this.loadSnapshot, before, this.wf());
    this.selectedRouting.set(this.indexOfActive());
  }

  /* The 5X question on Root only records the answer; once Root itself is signed, a "yes" auto-signs
     the Root VT/5X NDT stage. Answering must never sign anything on its own. */
  private signRelated5xIfNeeded(stage: WorkflowStage) {
    if (!this.job || !this.wf) return;
    if (stage.id !== 'root-weld' || (stage.inputs['performed5x'] ?? '') !== 'yes') return;
    const ndtStage = this.wf().stages.find(s => s.id === 'root-ndt-vt5x');
    if (!ndtStage || ndtStage.signed) return;
    this.sign('root-ndt-vt5x', this.signoffSnapshot(ndtStage));
  }

  /* ── References and navigation ── */

  addAttachments(files: FileList) {
    if (!this.job) return;
    for (const f of Array.from(files)) this.attachmentService.addAttachment(this.job, f.name);
  }
  removeAttachment(id: string) {
    if (this.job) this.attachmentService.removeAttachment(this.job, id);
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
