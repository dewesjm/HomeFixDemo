// Admin → Set step: force a job's workflow to a chosen stage (current-step override).
// Picks a job, shows its current step, and lets an admin jump it to any stage.
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideStepForward } from '@lucide/angular';

import { ConfirmService } from '../shared/confirm.service';

import { JOBS, Job } from '../data/jobs';
import { WorkflowService } from '../services/workflow.service';
import { currentStepLabel } from '../data/workflow';

@Component({
  selector: 'app-admin-set-step',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideStepForward],
  templateUrl: './admin-set-step.component.html'
})
export class AdminSetStepComponent {
  private wfService = inject(WorkflowService);
  private confirm = inject(ConfirmService);

  jobOptions = JOBS.map(j => ({ label: `${j.jobNumber} · ${j.title}`, value: j.id }));
  selectedJobId = signal<number | null>(null);
  targetIndex = signal<number | null>(null);

  selectedJob = computed<Job | undefined>(() => JOBS.find(j => j.id === this.selectedJobId()));

  /* reactive read of the selected job's workflow */
  private workflow = computed(() => {
    const job = this.selectedJob();
    return job ? this.wfService.workflowFor(job)() : null;
  });

  stepOptions = computed(() => {
    const wf = this.workflow();
    return wf ? wf.stages.map((s, i) => ({ label: `${i + 1}. ${s.label}`, value: i })) : [];
  });

  currentStep = computed(() => {
    const wf = this.workflow();
    return wf ? currentStepLabel(wf.stages) : '';
  });

  pickJob(id: number | null) {
    this.selectedJobId.set(id);
    this.targetIndex.set(null);
  }

  apply() {
    const job = this.selectedJob();
    const idx = this.targetIndex();
    if (!job || idx === null) return;
    const label = this.stepOptions()[idx]?.label ?? `step ${idx + 1}`;
    this.confirm.confirm({
      header: 'Force step?',
      message: `This re-opens "${label}" and every stage after it, discarding their sign-offs on ${job.jobNumber}. Continue?`,
      acceptLabel: 'Force step',
      rejectLabel: 'Cancel',
      accept: () => {
        this.wfService.forceStep(job, idx);
        this.targetIndex.set(null);   // current step now reflects the change
      }
    });
  }
}
