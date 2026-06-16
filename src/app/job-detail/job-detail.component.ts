//This is the job details page, lot of stuff in here

import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { StepsModule } from 'primeng/steps';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';

import { JOBS, Job, statusLabel as toStatusLabel } from '../data/jobs';
import { characteristicLabel } from '../data/characteristics';
import { CONDITION_OPTIONS } from '../data/conditions';
import { WorkflowService } from '../services/workflow.service';
import {
  WorkflowStage, StageField, StageResult, STAGE_RESULT_OPTIONS, WorkType, WORK_TYPE_OPTIONS,
  isStageLocked, currentStepLabel, activeStageId, allRequiredSigned
} from '../data/workflow';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, TagModule, SelectModule, InputTextModule, TooltipModule,
    TableModule, StepsModule, RadioButtonModule, FileUploadModule, MessageModule
  ],
  templateUrl: './job-detail.component.html'
})
export class JobDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wfService = inject(WorkflowService);

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

  /* steps model, locked stages disabled */
  stepsModel = computed<MenuItem[]>(() =>
    this.wf ? this.wf().stages.map((s, i) => ({ label: s.label, disabled: this.locked(i) })) : []);
  /* which stage's sign-off shows; defaults to active */
  selectedStep = signal<number>(this.initialStep());

  currentStep = computed(() => (this.wf ? currentStepLabel(this.wf().stages) : ''));
  /* done when all required stages signed */
  jobComplete = computed(() => (this.wf ? allRequiredSigned(this.wf().stages) : false));
  /* id of stage awaiting sign-off, null when done */
  activeStage = computed(() => (this.wf ? activeStageId(this.wf().stages) : null));
  /* index of stage awaiting sign-off */
  activeIndex = computed(() => this.indexOfActive());
  rejectedCount = computed(() =>
    this.wf ? this.wf().stages.filter(s => s.signed && s.result === 'reject').length : 0);
  history = computed(() => (this.wf ? [...this.wf().history].reverse() : []));

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
      { label: 'Job number', value: j.jobNumber },
      { label: 'Record ID', value: String(j.id) },
      { label: 'Inspection score', value: `${j.inspectionScore} / 5` },
      // Demo records/audit metadata
      { label: 'Reference document #', value: `45${String(j.id).padStart(8, '0')}` },
      { label: 'Department', value: this.COST_CENTERS[j.id % this.COST_CENTERS.length] },
      { label: 'Created by', value: 'Dispatch (auto)' },
      { label: 'Created on', value: fmt(-7 * DAY) },
      { label: 'Last changed', value: fmt(-1 * DAY) },
    ];
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
    return this.editable(stage) && !!stage.result && !!stage.inspectorName.trim();
  }

  //this colors the steps, unsure of implementation so not really used other than green
  stageSeverity(stage: WorkflowStage, i: number): 'success' | 'danger' | 'warn' | 'secondary' {
    if (stage.signed) return stage.result === 'reject' ? 'danger' : 'success';
    if (!stage.required) return 'secondary';
    return this.locked(i) ? 'secondary' : 'warn';
  }
  stageStatusText(stage: WorkflowStage, i: number): string {
    if (stage.signed) return stage.result === 'reject' ? 'Rejected' : 'Accepted';
    if (!stage.required) return 'Optional';
    return this.locked(i) ? 'Locked' : 'Awaiting sign-off';
  }
  stageIcon(stage: WorkflowStage, i: number): string {
    if (stage.signed) return stage.result === 'reject' ? 'pi pi-times-circle' : 'pi pi-check-circle';
    if (!stage.required) return 'pi pi-minus-circle';
    return this.locked(i) ? 'pi pi-lock' : 'pi pi-pencil';
  }

  // ---- stage inputs ----
  stageInputBlur(stage: WorkflowStage, field: StageField, value: string) {
    if (this.job && value !== (stage.inputs[field.key] ?? ''))
      this.wfService.setStageInput(this.job, stage.id, field, value);
  }
  /* select fields commit on change, clear maps to '' */
  stageSelectChange(stage: WorkflowStage, field: StageField, value: string | null) {
    const v = value ?? '';
    if (this.job && v !== (stage.inputs[field.key] ?? ''))
      this.wfService.setStageInput(this.job, stage.id, field, v);
  }

  // ---- per-stage sign-off ----
  private show(v: string | null | undefined): string { return v && v.length ? v : '—'; }

  setStageResult(stage: WorkflowStage, result: StageResult) {
    if (!this.job || result === stage.result) return;
    const old = stage.result;
    this.wfService.updateStageSignoff(this.job, stage.id, { result },
      { action: `${stage.label} — Decision`, from: old ? old.toUpperCase() : '—', to: result.toUpperCase() });
  }
  blurStageInspector(stage: WorkflowStage, value: string) {
    if (this.job && value !== stage.inspectorName)
      this.wfService.updateStageSignoff(this.job, stage.id, { inspectorName: value },
        { action: `${stage.label} — Inspector`, from: this.show(stage.inspectorName), to: this.show(value) });
  }
  blurStageLicense(stage: WorkflowStage, value: string) {
    if (this.job && value !== stage.licenseNo)
      this.wfService.updateStageSignoff(this.job, stage.id, { licenseNo: value },
        { action: `${stage.label} — License #`, from: this.show(stage.licenseNo), to: this.show(value) });
  }
  blurStageNotes(stage: WorkflowStage, value: string) {
    if (this.job && value !== stage.notes)
      this.wfService.updateStageSignoff(this.job, stage.id, { notes: value },
        { action: `${stage.label} — Notes`, from: this.show(stage.notes), to: this.show(value) });
  }
  signStage(stage: WorkflowStage) {
    if (!this.job || !this.canSignStage(stage)) return;
    this.wfService.signStage(this.job, stage.id);
    this.selectedStep.set(this.indexOfActive());   // advance the steps indicator
  }
  reopenStage(stage: WorkflowStage) {
    if (!this.job) return;
    this.wfService.reopenStage(this.job, stage.id);
    const idx = this.wf!().stages.findIndex(s => s.id === stage.id);
    if (idx >= 0) this.selectedStep.set(idx);
  }

  // ---- attachments ----
  addAttachments(event: { files: File[] }, fu: FileUpload) {
    if (!this.job) return;
    for (const f of event.files) this.wfService.addAttachment(this.job, f.name);
    fu.clear();   // reset so the same file can be picked again
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

 
  statusSeverity(s: Job['status']): 'success' | 'warn' | 'danger' {
    return s === 'completed' ? 'success' : s === 'in-progress' ? 'warn' : 'danger';
  }
  statusLabel(s: Job['status']): string { return toStatusLabel(s); }
  /* code description, shown on hover */
  codeLabel(code: string): string { return characteristicLabel(code); }
  back() {
    this.router.navigate(['/table']);
  }
}
