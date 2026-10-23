/* Signoff History on a step whose definition lists it (Records Review): the joint's History with the
   History screen's sort and column filters, every entry, no pager */
import { Component, computed, effect, input } from '@angular/core';
import { HistoryTableComponent } from '../work-history/history-table.component';
import { HistoryTableState } from '../work-history/history-table-state';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-signoff-history',
  standalone: true,
  imports: [HistoryTableComponent],
  host: { class: 'block' },
  template: `
    <div class="flex items-center justify-between mb-1">
      <div class="font-semibold text-sm">Signoff History</div>
      @if (table.expandableKeys().length) {
        <button type="button" class="btn btn-ghost btn-xs" (click)="table.toggleAll()">
          @if (table.allExpanded()) { Collapse all } @else { Expand all }
        </button>
      }
    </div>
    <app-history-table [table]="table" [oneJoint]="true" [emptyText]="emptyText()"
                       (deprogress)="ctx().deprogress($event.reason)" />
  `
})
export class SignoffHistoryComponent {
  ctx = input.required<SignoffContext>();

  table = new HistoryTableState();
  emptyText = computed(() => this.table.hasRows() ? 'No activity matches your filters.' : 'No signoff history yet.');

  constructor() {
    this.table.setPageSize(Number.MAX_SAFE_INTEGER);
    effect(() => this.table.setRows(this.ctx().history()));
  }
}
