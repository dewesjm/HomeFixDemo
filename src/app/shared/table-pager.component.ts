/* Pagination bar (rows-per-page + prev/next + range report) for TableState-backed tables. */
import { Component, input } from '@angular/core';
import { TableState } from './table-state';

@Component({
  selector: 'app-table-pager',
  standalone: true,
  template: `
    <div class="flex items-center justify-between gap-3 py-2 text-sm">
      <span class="opacity-70">
        Showing {{ state().rangeStart() }} to {{ state().rangeEnd() }} of {{ state().total() }}
      </span>
      <div class="flex items-center gap-2">
        <select class="select select-sm select-bordered"
                [value]="state().pageSize()"
                (change)="state().setPageSize(+$any($event.target).value)">
          @for (n of pageSizeOptions(); track n) {
            <option [value]="n">{{ n }} / page</option>
          }
        </select>
        <div class="join">
          <button type="button" class="btn btn-sm join-item" [disabled]="state().page() === 0"
                  (click)="state().goToPage(state().page() - 1)">‹</button>
          <button type="button" class="btn btn-sm join-item pointer-events-none">
            {{ state().page() + 1 }} / {{ state().pageCount() }}
          </button>
          <button type="button" class="btn btn-sm join-item" [disabled]="state().page() >= state().pageCount() - 1"
                  (click)="state().goToPage(state().page() + 1)">›</button>
        </div>
      </div>
    </div>
  `
})
export class TablePagerComponent {
  state = input.required<TableState<any>>();
  pageSizeOptions = input<number[]>([10, 25, 50, 100]);
}
