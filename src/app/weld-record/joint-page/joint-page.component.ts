//This is the job details page

/* The joint page: page state, wiring to the sign-off panel, and signing. A value changing on the
   sign-off form is SignoffFormEditsService, its red field messages SignoffFormErrorsService, the
   override state JointOverridesService; the form rules live in rules/. */
import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmService } from '../../shared/confirm.service';
import { RoutingBarComponent } from '../routing-bar/routing-bar.component';
import { JointDetailsComponent } from '../joint-details/joint-details.component';
import { FabricationComponent } from '../fabrication/fabrication.component';
import { SignoffPanelComponent } from '../signoff-panel/signoff-panel.component';
import { SignoffContext } from '../signoff-panel/signoff-context';
import { DeviationAcceptDialogComponent, DeviationAcceptRequest } from '../deviation-dialog/deviation-accept-dialog.component';
import { JointOverridesService } from './joint-overrides.service';
import { SignoffFormEditsService } from './signoff-form-edits.service';
import { SignoffFormErrorsService } from './signoff-form-errors.service';

import { JOBS, Job } from '../../data/jobs';
import { RoutingService } from '../services/routing.service';
import { SignoffService } from '../services/signoff.service';
import { ReferenceService } from '../services/reference.service';
import { FabricationDataService } from '../services/fabrication-data.service';
import { DeviationService } from '../services/deviation.service';
import { WeldAssignmentService } from '../services/weld-assignment.service';
import { WorkflowStore } from '../services/workflow-store.service';
import {
  WorkflowStage,
  StageField,
  SignoffField,
  STAGE_RESULT_OPTIONS,
  SignoffInput,
} from '../model/workflow-types';
import {
  isStageLocked,
  currentRoutingLabel,
  activeStageId,
  allRequiredSigned,
  fabricationEditable,
} from '../routing/current-routing';
import { routingBarSteps } from '../routing/routing-bar';
import { FabricationField } from '../fabrication/fabrication-fields';
import { snapshotInputs } from '../signoff-definition/stage-display';
import { visibleSignoffFields } from '../signoff-definition/shown-fields';
import { definitionHas } from '../signoff-definition/step-field-config';
import { HistoryRow, historyRows } from '../work-history/history-rows';
import { inspectionTypeRequired } from '../signoff-definition/stage-rules';
import { discardUnsignedEdits } from '../routing/route-changes';
import { isEngineeringHoldId, stepOnJoint } from '../routing/step-ids';
import { closesJoint } from '../routing/built-in-step-rules';
import { featureToggles } from '../../data/feature-toggles';
import { formatDate } from '../../shared/date-format';
import { fabricationErrors, fabricationFieldRequired, fabricationFieldsShown } from '../fabrication/fabrication-form';
import { StageFormContext, visibleStageFields } from './rules/stage-form';
import { SignContext, signProblems, stageFieldErrors } from './rules/sign-validation';
import { fitupVerifyValue, reviewVerifyValue } from './rules/verify-values';
import { routePreviewLabel } from '../routing/route-preview';
import { LoadedJoint, captureLoaded, hasUnsavedEdits, rebaselineAfterSignoff } from './rules/unsaved-edits';

@Component({
  selector: 'app-joint-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RoutingBarComponent, JointDetailsComponent, FabricationComponent, SignoffPanelComponent,
    DeviationAcceptDialogComponent
  ],
  providers: [JointOverridesService, SignoffFormEditsService, SignoffFormErrorsService],
  templateUrl: './joint-page.component.html'
})
export class JointPageComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(WorkflowStore);
  private wfService = inject(RoutingService);
  private signoffService = inject(SignoffService);
  private referenceService = inject(ReferenceService);
  private fabricationService = inject(FabricationDataService);
  private deviationService = inject(DeviationService);
  private weldAssignment = inject(WeldAssignmentService);
  private confirm = inject(ConfirmService);
  private overrides = inject(JointOverridesService);
  private formEdits = inject(SignoffFormEditsService);
  private formErrors = inject(SignoffFormErrorsService);

  job: Job | undefined = JOBS.find(j => j.id === this.route.snapshot.paramMap.get('id'));
  wf = this.job ? this.store.workflowFor(this.job) : null;

  /* snapshot of state as loaded, so unsigned/unsaved edits (Fab data, stage inputs, sign-off
     fields, Type choice) can be discarded when the user leaves without signing */
  private readonly loadSnapshot = this.wf ? this.assignAndSnapshot() : null;

  constructor() {
    if (this.job && this.wf && this.loadSnapshot) {
      const wf = this.wf;
      this.overrides.init({ job: this.job, wf: () => wf(), loaded: this.loadSnapshot, visibleFields: s => this.visibleFields(s) });
      this.formEdits.init({ job: this.job, wf });
      this.formErrors.init({ job: this.job, wf: () => wf() });
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

  /* the routing bar's steps (weld-record/routing/routing-bar.ts) */
  routingModel = computed<{ label: string; disabled: boolean; stageIndex: number }[]>(() =>
    this.wf ? routingBarSteps(this.wf().stages).map(s => ({ ...s, disabled: this.locked(s.stageIndex) })) : []);
  /* which stage's sign-off shows; defaults to active */
  selectedRouting = signal<number>(this.indexOfActive());

  currentRouting = computed(() => (this.wf ? currentRoutingLabel(this.wf().stages) : ''));
  /* done when all required stages signed */
  jobComplete = computed(() => (this.wf ? allRequiredSigned(this.wf().stages) : false));
  soldSigned = computed(() => !!this.wf?.().stages.some(s => closesJoint(s.id) && s.signed));
  /* fabrication fields locked unless the current step has Fabrication editable (Admin > Routing Settings) */
  fabLocked = computed(() => !!this.wf && !!this.job && !fabricationEditable(this.job.trade, this.wf().stages));
  /* id of stage awaiting sign-off, null when done */
  activeStage = computed(() => (this.wf ? activeStageId(this.wf().stages) : null));
  rejectedCount = computed(() =>
    this.wf ? this.wf().stages.filter(s => s.signed && s.result === 'unsat').length : 0);

  /* the joint's History rows, as the History screen shows them (Records Review) */
  history = computed<HistoryRow[]>(() => (this.wf ? historyRows(this.wf(), this.job) : []));

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
    const edits = this.formEdits;
    const errors = this.formErrors;
    return {
      job,
      wf: () => ({ stages: w.stages, fabricationData: w.fabricationData }),
      history: () => this.history(),
      references: () => this.wf?.().references ?? [],
      selectedRouting: () => this.selectedRouting(),
      jobComplete: () => this.jobComplete(),
      rejectedCount: () => this.rejectedCount(),
      resultOptions: STAGE_RESULT_OPTIONS,
      editable: (s) => this.editable(s),
      inputsEditable: (s, i) => this.inputsEditable(s, i),
      visibleFields: (s) => this.visibleFields(s),
      visibleSignoffFields: (s) => this.visibleSignoffFields(s),
      fieldError: (sid, fk) => errors.fieldError(sid, fk),
      clearFieldError: (sid, fk) => errors.clearFieldError(sid, fk),
      getFabValue: (k) => fitupVerifyValue(k, job, this.fab()),
      getReviewValue: (k) => reviewVerifyValue(k, job),
      inspectionTypeRequired: (s) => inspectionTypeRequired(s),
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
      stageInputBlur: (s, f, v) => edits.stageInputBlur(s, f, v),
      stageSelectChange: (s, f, v) => edits.stageSelectChange(s, f, v),
      blurSignoffField: (s, f, v) => edits.setSignoffInput(s, f, v),
      signoffSelectChange: (s, f, v) => edits.setSignoffInput(s, f, v ?? ''),
      signoffCheckboxChange: (s, f, c) => edits.setSignoffInput(s, f, c ? 'yes' : '', false),
      toggleAffectedItem: (s, item, e) => edits.toggleAffectedItem(s, item, e),
      onConsumableInsertChange: (s, v) => edits.onConsumableInsertChange(s, v),
      setType: (s, v) => edits.setType(s, v),
      setStageResult: (s, r) => edits.setStageResult(s, r),
      signStage: (s) => this.signStage(s),
      deprogress: (reason) => this.deprogress(reason),
      addReferences: (files) => this.addReferences(files),
      removeReference: (id) => this.removeReference(id),
    };
  });

  private formCtx(stage: WorkflowStage): StageFormContext {
    return { job: this.job, stages: this.wf?.().stages ?? [], offListUnlocked: this.overrides.offListUnlocked(stage), fab: this.fab() };
  }

  visibleFields(stage: WorkflowStage): StageField[] {
    return visibleStageFields(stage, this.formCtx(stage));
  }

  visibleSignoffFields(stage: WorkflowStage): SignoffField[] {
    return visibleSignoffFields(stage, this.job, this.fab());
  }

  /* ── Routing preview ── */

  /* the demo routing preview under the Signoff button (route-preview.ts) */
  private routingPreviewOn = featureToggles().routingPreview;
  routePreviewLabel(stage: WorkflowStage): string {
    if (!this.routingPreviewOn || !this.job || !this.wf) return '';
    const wf = this.wf();
    const job = this.job;
    const hold = () => this.overrides.stageDeviations(stage).length > 0;
    return routePreviewLabel(job, wf.stages, stage, this.activeStage(),
      result => this.signoffService.previewSignoff(wf, job, stage.id, result, hold()));
  }

  /* ── Validation ── */

  private signCtx(stage: WorkflowStage): SignContext {
    return { job: this.job, fab: this.fab(), fabErrors: this.fabErrors(), visibleFields: this.visibleFields(stage), stages: this.wf?.().stages };
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

  /* ── Signing ── */

  /* What History records for a sign-off: every editable field the user was shown, with its value right now
     (blanks included). Read from the live workflow, since the stage object a click handler holds can be stale. */
  private signoffSnapshot(stage: WorkflowStage): SignoffInput[] {
    const st = this.wf?.().stages.find(s => s.id === stage.id) ?? stage;
    const out = snapshotInputs(st, this.visibleFields(st), this.visibleSignoffFields(st));
    if (definitionHas(st, 'affectedItem') && this.job) {
      const names = (st.inputs['affectedItems'] ?? '').split(',').filter(Boolean).map(k => this.job![k as 'joiningItem' | 'joinToItem']);
      out.push({ label: 'Affected Item', value: names.join(', ') });
    }
    return out;
  }

  signStage(stage: WorkflowStage) {
    if (!this.job || this.heldAt(stage)) return;
    /* validate required fields + range constraints */
    if (this.formErrors.showSigningErrors(stageFieldErrors(stage, this.signCtx(stage)))) return;
    if (!this.canSignStage(stage)) return;
    /* a repeatable Type (Interim Layer, Weld Build-Up) goes through the same signoff; SignoffService keeps the routing where it is */
    const st = this.wf?.().stages.find(s => s.id === stage.id) ?? stage;
    const deviations = this.overrides.stageDeviations(st);
    if (deviations.length) {
      this.deviationRequest.set({ stage: st, stageLabel: st.label, items: deviations });
      return;
    }
    this.confirm.confirm({
      header: 'Confirm sign-off',
      message: `By signing, I certify that all recorded values are accurate and the work has been performed in accordance with applicable standards.`,
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
     the Root 5X/VT NDT stage. Answering must never sign anything on its own. */
  private signRelated5xIfNeeded(stage: WorkflowStage) {
    if (!this.job || !this.wf) return;
    if (stage.id !== 'root-weld' || (stage.inputs['performed5x'] ?? '') !== 'yes') return;
    const ndtStage = stepOnJoint(this.wf().stages, 'root-ndt-vt5x');
    if (!ndtStage || ndtStage.signed) return;
    this.sign(ndtStage.id, this.signoffSnapshot(ndtStage));
  }

  /* ── References and navigation ── */

  addReferences(files: FileList) {
    if (!this.job) return;
    for (const f of Array.from(files)) this.referenceService.addReference(this.job, f.name);
  }
  removeReference(id: string) {
    if (this.job) this.referenceService.removeReference(this.job, id);
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
