/* Sortable table header cell with an optional per-column filter (text box or multiselect).
   Usage: <th appSortHeader [table]="table" field="joint" label="Joint" filter="text" class="min-w-20"></th>
   With [clickToFilter]="true" the filter box stays hidden until the heading's funnel is clicked;
   the funnel is highlighted while the column is filtering. */
import { Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX, LucideListFilter, LucideFunnel } from '@lucide/angular';

import { MultiselectDropdownComponent, SelectOption } from './multiselect-dropdown.component';
import { TableState } from './table-state';

@Component({
  selector: 'th[appSortHeader]',
  standalone: true,
  imports: [FormsModule, MultiselectDropdownComponent, LucideX, LucideListFilter, LucideFunnel],
  template: `
    @if (filter() === 'none') {
      <a class="cursor-pointer select-none" (click)="table().toggleSort(field())">{{ label() }} {{ arrow() }}</a>
    } @else {
      <div class="flex flex-col items-start gap-1 min-w-0">
        <div class="flex items-center gap-1">
          <a class="cursor-pointer select-none" (click)="table().toggleSort(field())">{{ label() }} {{ arrow() }}</a>
          @if (clickToFilter()) {
            <button type="button" class="btn btn-ghost btn-xs px-1" [class.text-primary]="active()"
                    [class.opacity-50]="!active() && !open()" [attr.aria-expanded]="open()"
                    [attr.aria-label]="'Filter ' + label()" [title]="'Filter ' + label()" (click)="open.set(!open())">
              <svg lucideFunnel class="size-3.5" [class.fill-current]="active()"></svg>
            </button>
          }
        </div>
        @if (clickToFilter() && !open()) {
          <!-- filter box hidden until the funnel is clicked -->
        } @else if (filter() === 'text') {
          <label class="input input-xs input-bordered flex items-center gap-1 w-full min-w-0 col-filter-mobile" [title]="'Filter ' + label()">
            <svg lucideListFilter class="size-3 opacity-60 shrink-0"></svg>
            <!-- size="1": without it the box's default ~20-character width sets the column's minimum width -->
            <input type="text" class="grow min-w-0" size="1"
                   [ngModel]="table().columnFilters()[field()] ?? ''"
                   (ngModelChange)="table().setColumnFilter(field(), $event)" />
            @if (table().columnFilters()[field()]) {
              <button type="button" class="btn btn-ghost btn-xs p-0 shrink-0"
                      (click)="table().setColumnFilter(field(), '')">
                <svg lucideX class="size-3 opacity-60"></svg>
              </button>
            }
          </label>
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
  clickToFilter = input(false);
  open = signal(false);

  /* this column has a filter value */
  active = computed(() => {
    const v = this.table().columnFilters()[this.field()];
    return Array.isArray(v) ? v.length > 0 : !!v;
  });

  arrow() {
    return this.table().sortField() === this.field() ? (this.table().sortOrder() === 1 ? '▲' : '▼') : '';
  }
}
