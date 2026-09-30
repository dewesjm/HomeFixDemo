/* Weld Engineering > Engineering Queue > Review: one joint on Engineering Hold. Shows its deviations
   (open ones first, then earlier ones kept on record), and Engineering enters comments and picks the
   step the routing is set to; the joint carries on from there (DeviationService.disposition). */
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideArrowUpRight, LucideCheck } from '@lucide/angular';

import { JOBS } from '../../data/jobs';
import { currentRoutingLabel, isEngineeringHoldId } from '../../data/workflow';
import { WorkflowStore } from '../../weld-record/services/workflow-store.service';
import { DeviationService } from '../../weld-record/services/deviation.service';
import { ToastService } from '../../shared/toast.service';
import { AppDateTimePipe } from '../../shared/date-format';

@Component({
  selector: 'app-engineering-review',
  standalone: true,
  imports: [FormsModule, RouterLink, AppDateTimePipe, LucideArrowLeft, LucideArrowUpRight, LucideCheck],
  templateUrl: './engineering-review.component.html',
})
export class EngineeringReviewComponent {
  private store = inject(WorkflowStore);
  private deviationService = inject(DeviationService);
  private messages = inject(ToastService);
  private router = inject(Router);

  job = JOBS.find(j => j.id === inject(ActivatedRoute).snapshot.paramMap.get('id'));
  private wf = this.job ? this.store.workflowFor(this.job) : null;

  currentRouting = computed(() => (this.wf ? currentRoutingLabel(this.wf().stages) : ''));
  open = computed(() => (this.wf ? this.deviationService.openDeviations(this.wf()) : []));
  earlier = computed(() => (this.wf?.().deviations ?? []).filter(d => d.status !== 'open').reverse());

  /* any step on the joint except the holds themselves */
  steps = computed(() => (this.wf?.().stages ?? []).filter(s => !isEngineeringHoldId(s.id))
    .map(s => ({ id: s.id, label: s.label, signed: s.signed })));

  comments = signal('');
  /* starts on where the joint would go next: the first required step not yet signed */
  routeTo = signal(this.wf?.().stages.find(s => s.required && !s.signed && !isEngineeringHoldId(s.id))?.id ?? '');
  tried = signal(false);

  statusLabel(status: string) {
    return status === 'dispositioned' ? 'Dispositioned' : status === 'withdrawn' ? 'Withdrawn (sign-off deprogressed)' : 'Open';
  }

  setRouting() {
    this.tried.set(true);
    if (!this.job || !this.comments().trim() || !this.routeTo()) return;
    const label = this.steps().find(s => s.id === this.routeTo())?.label ?? '';
    this.deviationService.disposition(this.job, this.comments().trim(), this.routeTo());
    this.messages.add({ severity: 'success', summary: 'Routing set', detail: label, life: 3000 });
    this.router.navigate(['/weld-engineering/queue']);
  }
}
