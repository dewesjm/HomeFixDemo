// Admin → Set routing: force a job's workflow to a chosen stage (current-routing override).
// Picks a job, shows its current routing, and lets an admin jump it to any stage.
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideStepForward } from '@lucide/angular';

import { ConfirmService } from '../shared/confirm.service';

import { JOBS, Job } from '../data/jobs';
import { WorkflowService } from '../services/workflow.service';
import { currentRoutingLabel } from '../data/workflow';

@Component({
  selector: 'app-admin-set-routing',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideStepForward],
  templateUrl: './admin-set-routing.component.html'
})
export class AdminSetRoutingComponent {
  private wfService = inject(WorkflowService);
  private confirm = inject(ConfirmService);

  jobOptions = JOBS.map(j => ({ label: j.hull, value: j.id }));
  selectedJobId = signal<string | null>(null);
  targetIndex = signal<number | null>(null);

  selectedJob = computed<Job | undefined>(() => JOBS.find(j => j.id === this.selectedJobId()));

  /* reactive read of the selected job's workflow */
  private workflow = computed(() => {
    const job = this.selectedJob();
    return job ? this.wfService.workflowFor(job)() : null;
  });

  routingOptions = computed(() => {
    const wf = this.workflow();
    return wf ? wf.stages.map((s, i) => ({ label: `${i + 1}. ${s.label}`, value: i })) : [];
  });

  currentRouting = computed(() => {
    const wf = this.workflow();
    return wf ? currentRoutingLabel(wf.stages) : '';
  });

  pickJob(id: string | null) {
    this.selectedJobId.set(id);
    this.targetIndex.set(null);
  }

  apply() {
    const job = this.selectedJob();
    const idx = this.targetIndex();
    if (!job || idx === null) return;
    const label = this.routingOptions()[idx]?.label ?? `routing ${idx + 1}`;
    this.confirm.confirm({
      header: 'Force routing?',
      message: `This re-opens "${label}" and every stage after it, discarding their sign-offs on ${job.hull}. Continue?`,
      acceptLabel: 'Force routing',
      rejectLabel: 'Cancel',
      accept: () => {
        this.wfService.forceRouting(job, idx);
        this.targetIndex.set(null);   // current routing now reflects the change
      }
    });
  }
}
