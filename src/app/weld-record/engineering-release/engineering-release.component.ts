/* Shown on a joint's Engineering Hold step (signoff panel) in place of Signoff: the open deviations,
   then Engineering's comments and the step the routing is set to. Set routing releases the hold
   (DeviationService.disposition) and the joint carries on from that step. Joints on hold are listed
   under Pipe Welding's Engineering role. */
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideCheck } from '@lucide/angular';

import { Job } from '../../data/jobs';
import { isEngineeringHoldId } from '../../data/workflow';
import { WorkflowStore } from '../services/workflow-store.service';
import { DeviationService } from '../services/deviation.service';
import { ToastService } from '../../shared/toast.service';
import { AppDateTimePipe } from '../../shared/date-format';

@Component({
  selector: 'app-engineering-release',
  standalone: true,
  imports: [FormsModule, AppDateTimePipe, LucideCheck],
  templateUrl: './engineering-release.component.html',
})
export class EngineeringReleaseComponent {
  job = input.required<Job>();

  private store = inject(WorkflowStore);
  private deviationService = inject(DeviationService);
  private messages = inject(ToastService);

  private wf = computed(() => this.store.workflowFor(this.job())());
  open = computed(() => this.deviationService.openDeviations(this.wf()));

  /* any step on the joint except the holds themselves */
  steps = computed(() => this.wf().stages.filter(s => !isEngineeringHoldId(s.id))
    .map(s => ({ id: s.id, label: s.label, signed: s.signed })));

  comments = signal('');
  /* empty = where the joint would go next: the first required step not yet signed */
  private picked = signal('');
  routeTo = computed(() => this.picked()
    || this.wf().stages.find(s => s.required && !s.signed && !isEngineeringHoldId(s.id))?.id || '');
  tried = signal(false);

  pick(id: string) { this.picked.set(id); }

  setRouting() {
    this.tried.set(true);
    if (!this.comments().trim() || !this.routeTo()) return;
    const label = this.steps().find(s => s.id === this.routeTo())?.label ?? '';
    this.deviationService.disposition(this.job(), this.comments().trim(), this.routeTo());
    this.messages.add({ severity: 'success', summary: 'Routing set', detail: label, life: 3000 });
    this.comments.set('');
    this.picked.set('');
    this.tried.set(false);
  }
}
