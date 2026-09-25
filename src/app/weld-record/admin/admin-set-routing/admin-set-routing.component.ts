// Admin → Set routing: change a job's current routing to any step. Nothing is marked signed;
// going back blanks that step and every step after it, going forward leaves the steps passed as they are.
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideRoute } from '@lucide/angular';

import { ConfirmService } from '../../../shared/confirm.service';

import { JOBS, Job } from '../../../data/jobs';
import { RoutingService } from '../../services/routing.service';
import { WorkflowStore } from '../../services/workflow-store.service';
import { currentRoutingLabel, activeStageId } from '../../../data/workflow';

@Component({
  selector: 'app-admin-set-routing',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideRoute],
  templateUrl: './admin-set-routing.component.html'
})
export class AdminSetRoutingComponent {
  private store = inject(WorkflowStore);
  private wfService = inject(RoutingService);
  private confirm = inject(ConfirmService);

  jobOptions = JOBS.map(j => ({ label: `${j.hull} · ${j.drawing} · ${j.joint} (${j.id})`, value: j.id }));
  selectedJobId = signal<string | null>(null);
  targetId = signal<string | null>(null);

  selectedJob = computed<Job | undefined>(() => JOBS.find(j => j.id === this.selectedJobId()));

  /* reactive read of the selected job's workflow */
  private workflow = computed(() => {
    const job = this.selectedJob();
    return job ? this.store.workflowFor(job)() : null;
  });

  /* every required step except the current routing */
  routingOptions = computed(() => {
    const wf = this.workflow();
    if (!wf) return [];
    const active = activeStageId(wf.stages);
    return wf.stages
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.required && s.id !== active)
      .map(({ s, i }) => ({ label: `${i + 1}. ${s.label}`, value: s.id }));
  });

  currentRouting = computed(() => {
    const wf = this.workflow();
    return wf ? currentRoutingLabel(wf.stages) : '';
  });

  pickJob(id: string | null) {
    this.selectedJobId.set(id);
    this.targetId.set(null);
  }

  apply() {
    const job = this.selectedJob();
    const id = this.targetId();
    if (!job || id === null) return;
    const label = this.routingOptions().find(o => o.value === id)?.label ?? id;
    const stages = this.workflow()?.stages ?? [];
    const activeIdx = stages.findIndex(s => s.id === activeStageId(stages));
    const back = activeIdx < 0 || stages.findIndex(s => s.id === id) < activeIdx;
    this.confirm.confirm({
      header: 'Set routing?',
      message: back
        ? `This sets the current routing of ${job.hull} back to "${label}". That step and every step after it come up blank and are signed again. Earlier signoffs are kept. Continue?`
        : `This sets the current routing of ${job.hull} to "${label}". Nothing is signed; the steps before it stay as they are. Continue?`,
      acceptLabel: 'Set routing',
      rejectLabel: 'Cancel',
      accept: () => {
        this.wfService.setRouting(job, id);
        this.targetId.set(null);   // current routing now reflects the change
      }
    });
  }
}
