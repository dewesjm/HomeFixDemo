// Admin → Set routing: change a job's current routing to any step. Nothing is marked signed;
// going back blanks that step and every step after it, going forward leaves the steps passed as they are.
// The joint is found by typing its Hull, Drawing and Joint exactly (no picking from a list), and a reason
// is required; it's recorded on the History entry.
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

  hull = signal('');
  drawing = signal('');
  joint = signal('');
  targetId = signal<string | null>(null);
  reason = signal('');

  /* all three typed in; matched ignoring case and surrounding spaces */
  allTyped = computed(() => !!(this.hull().trim() && this.drawing().trim() && this.joint().trim()));
  selectedJob = computed<Job | undefined>(() => {
    if (!this.allTyped()) return undefined;
    const eq = (a: string, b: string) => a.trim().toUpperCase() === String(b).trim().toUpperCase();
    return JOBS.find(j => eq(this.hull(), j.hull) && eq(this.drawing(), j.drawing) && eq(this.joint(), j.joint));
  });

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

  /* typing a different joint drops the routing picked for the previous one */
  setKey(field: 'hull' | 'drawing' | 'joint', value: string) {
    this[field].set(value);
    this.targetId.set(null);
  }

  apply() {
    const job = this.selectedJob();
    const id = this.targetId();
    const reason = this.reason().trim();
    if (!job || id === null || !reason) return;
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
        this.wfService.setRouting(job, id, reason);
        this.targetId.set(null);   // current routing now reflects the change
        this.reason.set('');
      }
    });
  }
}
