// Job detail page — sections: Details, Stages (each stage is its own sign-off card, shown
// one-at-a-time in a PrimeNG accordion), a cross-stage Work validation section, Attachments,
// plus the per-job history log. All edits go through WorkflowService, which logs
// before→after to the audit trail.
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { AccordionModule } from 'primeng/accordion';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';

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
    TableModule, AccordionModule, RadioButtonModule, FileUploadModule
  ],
  templateUrl: './job-detail.component.html'
})
export class JobDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wfService = inject(WorkflowService);

  job: Job | undefined = JOBS.find(j => j.id === Number(this.route.snapshot.paramMap.get('id')));
  wf = this.job ? this.wfService.workflowFor(this.job) : null;

  // New-component form model
  newName = signal('');
  newPart = signal('');
  newQty = signal(1);

  resultOptions = STAGE_RESULT_OPTIONS;
  workTypeOptions = WORK_TYPE_OPTIONS;
  conditionOptions = CONDITION_OPTIONS;

  /** Which accordion panel (stage id) is open. Defaults to the stage awaiting sign-off. */
  openPanel = signal<string | null>(this.wf ? activeStageId(this.wf().stages) : null);

  currentStep = computed(() => (this.wf ? currentStepLabel(this.wf().stages) : ''));
  /** Whole job is done once every required stage is signed. */
  jobComplete = computed(() => (this.wf ? allRequiredSigned(this.wf().stages) : false));
  /** Id of the stage currently awaiting sign-off (null when complete). */
  activeStage = computed(() => (this.wf ? activeStageId(this.wf().stages) : null));
  rejectedCount = computed(() =>
    this.wf ? this.wf().stages.filter(s => s.signed && s.result === 'reject').length : 0);
  history = computed(() => (this.wf ? [...this.wf().history].reverse() : []));

  // ---- stage display helpers ----
  /** A stage is locked until every required stage before it is signed. */
  locked(i: number): boolean {
    return this.wf ? isStageLocked(this.wf().stages, i) : true;
  }
  /** The stage's sign-off fields are editable only while it's the active (current) stage. */
  editable(stage: WorkflowStage): boolean {
    return stage.required && !stage.signed && stage.id === this.activeStage();
  }
  /** Data inputs are editable on the active stage, or on an unlocked optional stage. */
  inputsEditable(stage: WorkflowStage, i: number): boolean {
    return !stage.signed && !this.locked(i);
  }
  /** Allow re-opening only the most recently signed stage. */
  canReopen(stage: WorkflowStage, i: number): boolean {
    if (!stage.signed || !this.wf) return false;
    return !this.wf().stages.slice(i + 1).some(s => s.required && s.signed);
  }
  canSignStage(stage: WorkflowStage): boolean {
    return this.editable(stage) && !!stage.result && !!stage.inspectorName.trim();
  }

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
  /** Dropdown (type: 'select') stage fields commit on change; clearing maps to ''. */
  stageSelectChange(stage: WorkflowStage, field: StageField, value: string | null) {
    const v = value ?? '';
    if (this.job && v !== (stage.inputs[field.key] ?? ''))
      this.wfService.setStageInput(this.job, stage.id, field, v);
  }

  // ---- per-stage sign-off ----
  private q(v: string | null | undefined): string { return v && v.length ? `“${v}”` : '—'; }

  setStageResult(stage: WorkflowStage, result: StageResult) {
    if (!this.job || result === stage.result) return;
    const old = stage.result;
    this.wfService.updateStageSignoff(this.job, stage.id, { result },
      `Stage “${stage.label}” — Decision: ${old ? old.toUpperCase() : '—'} → ${result.toUpperCase()}`);
  }
  blurStageInspector(stage: WorkflowStage, value: string) {
    if (this.job && value !== stage.inspectorName)
      this.wfService.updateStageSignoff(this.job, stage.id, { inspectorName: value },
        `Stage “${stage.label}” — Inspector: ${this.q(stage.inspectorName)} → ${this.q(value)}`);
  }
  blurStageLicense(stage: WorkflowStage, value: string) {
    if (this.job && value !== stage.licenseNo)
      this.wfService.updateStageSignoff(this.job, stage.id, { licenseNo: value },
        `Stage “${stage.label}” — License #: ${this.q(stage.licenseNo)} → ${this.q(value)}`);
  }
  blurStageNotes(stage: WorkflowStage, value: string) {
    if (this.job && value !== stage.notes)
      this.wfService.updateStageSignoff(this.job, stage.id, { notes: value },
        `Stage “${stage.label}” — Notes: ${this.q(stage.notes)} → ${this.q(value)}`);
  }
  signStage(stage: WorkflowStage) {
    if (!this.job || !this.canSignStage(stage)) return;
    this.wfService.signStage(this.job, stage.id);
    this.openPanel.set(this.wf ? activeStageId(this.wf().stages) : null);  // advance to next
  }
  reopenStage(stage: WorkflowStage) {
    if (!this.job) return;
    this.wfService.reopenStage(this.job, stage.id);
    this.openPanel.set(stage.id);
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

  // ---- misc ----
  statusSeverity(s: Job['status']): 'success' | 'warn' | 'danger' {
    return s === 'completed' ? 'success' : s === 'in-progress' ? 'warn' : 'danger';
  }
  statusLabel(s: Job['status']): string { return toStatusLabel(s); }
  /** Description for a characteristic code, shown on hover in the details grid. */
  codeLabel(code: string): string { return characteristicLabel(code); }
  back() {
    this.router.navigate(['/table']);
  }
}
