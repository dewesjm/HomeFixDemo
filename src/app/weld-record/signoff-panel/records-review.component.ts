/* The O63 / O04 Records Review step: verify the joint's record fields, with the joint's History alongside */
import { Component, computed, effect, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkflowStage } from '../../data/workflow';
import { HistoryTableComponent } from '../work-history/history-table.component';
import { HistoryTableState } from '../work-history/history-table-state';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-records-review',
  standalone: true,
  imports: [FormsModule, HistoryTableComponent],
  host: { class: 'block' },
  templateUrl: './records-review.component.html'
})
export class RecordsReviewComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();

  /* the joint's History with the History screen's sort and column filters; every entry, no pager */
  table = new HistoryTableState();
  emptyText = computed(() => this.table.hasRows() ? 'No activity matches your filters.' : 'No signoff history yet.');

  constructor() {
    this.table.setPageSize(Number.MAX_SAFE_INTEGER);
    effect(() => this.table.setRows(this.ctx().history()));
  }
}
