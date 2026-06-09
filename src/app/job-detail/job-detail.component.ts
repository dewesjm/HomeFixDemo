// Job detail page — sections: Details, Stages (with per-step inputs), Work validation
// (components + notes), Attachments, Sign-off, plus the per-job history log. All edits go
// through WorkflowService, which logs before→after to the audit trail.
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
import { FileUpload, FileUploadModule } from 'primeng/fileupload';

import { JOBS, Job, statusLabel as toStatusLabel } from '../data/jobs';
import { WorkflowService } from '../services/workflow.service';
import {
  WorkflowStage, StageField, SignResult,
  isStageLocked, currentStepLabel, allRequiredDone
} from '../data/workflow';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, TagModule, SelectModule, InputTextModule, TooltipModule,
    TableModule, FileUploadModule
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

  resultOptions: { label: string; value: SignResult }[] = [
    { label: 'Pass', value: 'pass' },
    { label: 'Conditional', value: 'conditional' },
    { label: 'Fail', value: 'fail' }
  ];

  currentStep = computed(() => (this.wf ? currentStepLabel(this.wf().stages) : ''));
  requiredDone = computed(() => (this.wf ? allRequiredDone(this.wf().stages) : false));
  // Applicable stages that carry data fields — rendered in the Work validation section.
  stagesWithInputs = computed(() =>
    this.wf ? this.wf().stages.filter(s => s.status !== 'not-required' && !!s.fields?.length) : []);
  history = computed(() => (this.wf ? [...this.wf().history].reverse() : []));

  // ---- stage display helpers ----
  locked(i: number): boolean {
    return this.wf ? isStageLocked(this.wf().stages, i) : true;
  }
  /** The active step: required, not done, and not blocked by an earlier stage. */
  actionable(stage: WorkflowStage, i: number): boolean {
    return stage.required && stage.status !== 'done' && !this.locked(i);
  }
  /** Allow undo only on the most recently completed stage. */
  canUndo(stage: WorkflowStage, i: number): boolean {
    if (stage.status !== 'done' || !this.wf) return false;
    return !this.wf().stages.slice(i + 1).some(s => s.required && s.status !== 'pending' && s.status !== 'not-required');
  }
  stageClass(stage: WorkflowStage, i: number): string {
    if (stage.status === 'not-required') return 'stage stage--skip';
    if (stage.status === 'done') return 'stage stage--done';
    if (stage.status === 'failed') return 'stage stage--fail';
    return this.locked(i) ? 'stage stage--locked' : 'stage stage--current';
  }
  stageIcon(stage: WorkflowStage, i: number): string {
    if (stage.status === 'done') return 'pi pi-check-circle';
    if (stage.status === 'failed') return 'pi pi-times-circle';
    if (stage.status === 'not-required') return 'pi pi-minus-circle';
    return this.locked(i) ? 'pi pi-lock' : 'pi pi-circle';
  }

  // ---- actions ----
  markStage(stage: WorkflowStage, status: 'done' | 'failed' | 'pending') {
    if (this.job) this.wfService.setStage(this.job, stage.id, status);
  }

  stageInputBlur(stage: WorkflowStage, field: StageField, value: string) {
    if (this.job && value !== (stage.inputs[field.key] ?? ''))
      this.wfService.setStageInput(this.job, stage.id, field, value);
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

  private q(v: string | null | undefined): string { return v && v.length ? `“${v}”` : '—'; }

  setResult(result: SignResult) {
    if (!this.job) return;
    const old = this.wf!().signoff.result;
    this.wfService.updateSignoff(this.job, { result },
      `Result: ${old ? old.toUpperCase() : '—'} → ${result.toUpperCase()}`);
  }
  blurInspector(value: string) {
    const old = this.wf!().signoff.inspectorName;
    if (this.job && value !== old)
      this.wfService.updateSignoff(this.job, { inspectorName: value }, `Inspector: ${this.q(old)} → ${this.q(value)}`);
  }
  blurLicense(value: string) {
    const old = this.wf!().signoff.licenseNo;
    if (this.job && value !== old)
      this.wfService.updateSignoff(this.job, { licenseNo: value }, `License #: ${this.q(old)} → ${this.q(value)}`);
  }
  blurNotes(value: string) {
    const old = this.wf!().signoff.notes;
    if (this.job && value !== old)
      this.wfService.updateSignoff(this.job, { notes: value }, `Notes: ${this.q(old)} → ${this.q(value)}`);
  }

  canSign = computed(() => {
    if (!this.wf) return false;
    const s = this.wf().signoff;
    return !s.signed && this.requiredDone() && !!s.inspectorName.trim() && !!s.result;
  });
  signOff() {
    if (this.job && this.canSign()) this.wfService.signOff(this.job);
  }
  reopen() {
    if (this.job) this.wfService.reopen(this.job);
  }

  statusSeverity(s: Job['status']): 'success' | 'warn' | 'danger' {
    return s === 'completed' ? 'success' : s === 'in-progress' ? 'warn' : 'danger';
  }

  statusLabel(s: Job['status']): string { return toStatusLabel(s); }
  back() {
    this.router.navigate(['/table']);
  }
}
