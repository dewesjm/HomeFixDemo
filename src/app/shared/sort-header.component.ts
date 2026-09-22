/* Sortable table header cell with an optional per-column filter (text box or multiselect).
   Usage: <th appSortHeader [table]="table" field="joint" label="Joint" filter="text" class="min-w-20"></th> */
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX, LucideListFilter } from '@lucide/angular';

import { MultiselectDropdownComponent, SelectOption } from './multiselect-dropdown.component';
import { TableState } from './table-state';

@Component({
  selector: 'th[appSortHeader]',
  standalone: true,
  imports: [FormsModule, MultiselectDropdownComponent, LucideX, LucideListFilter],
  template: `
    @if (filter() === 'none') {
      <a class="cursor-pointer select-none" (click)="table().toggleSort(field())">{{ label() }} {{ arrow() }}</a>
    } @else {
      <div class="flex flex-col items-start gap-1 min-w-0">
        <a class="cursor-pointer select-none" (click)="table().toggleSort(field())">{{ label() }} {{ arrow() }}</a>
        @if (filter() === 'text') {
          <div class="relative col-filter-mobile">
            <svg lucideListFilter class="size-3 opacity-60 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none"></svg>
            <input type="text" class="input input-xs input-bordered w-full min-w-0 pl-5 pr-5" [title]="'Filter ' + label()"
                   [ngModel]="table().columnFilters()[field()] ?? ''"
                   (ngModelChange)="table().setColumnFilter(field(), $event)" />
            @if (table().columnFilters()[field()]) {
              <button type="button" class="absolute right-1 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs p-0"
                      (click)="table().setColumnFilter(field(), '')">
                <svg lucideX class="size-3 opacity-60"></svg>
              </button>
            }
          </div>
        } @else {
          <app-multiselect-dropdown class="block w-full min-w-0" [options]="options()"
            [selected]="table().columnFilters()[field()] ?? []"
            (selectedChange)="table().setColumnFilter(field(), $event)" />
        }
      </div>
    }
  `
})
export class SortHeaderComponent {
  table = input.required<TableState<any>>();
  field = input.required<string>();
  label = input.required<string>();
  filter = input<'none' | 'text' | 'select'>('none');
  options = input<SelectOption[]>([]);

  arrow() {
    return this.table().sortField() === this.field() ? (this.table().sortOrder() === 1 ? '▲' : '▼') : '';
  }
}
