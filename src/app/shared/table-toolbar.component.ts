/* Toolbar above an admin table: search box, then Export, then Add (only where rows can be added).
   Pages that add rows through their own inline controls put them in a [toolbarEnd] element instead of addLabel.
   Usage: <app-table-toolbar [table]="table" searchPlaceholder="Search locations…" addLabel="Add location"
            (exportCsv)="exportCsv()" (add)="addRow()" /> */
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideX, LucideFileSpreadsheet, LucidePlus } from '@lucide/angular';

import { TableState } from './table-state';

@Component({
  selector: 'app-table-toolbar',
  standalone: true,
  imports: [FormsModule, LucideSearch, LucideX, LucideFileSpreadsheet, LucidePlus],
  template: `
    <div class="facet-row">
      <label class="input input-sm input-bordered flex items-center gap-2 search-input">
        <svg lucideSearch class="size-4"></svg>
        <input type="text" class="grow" [placeholder]="searchPlaceholder()"
               [ngModel]="table().globalFilter()" (ngModelChange)="table().setGlobalFilter($event)" />
        @if (table().globalFilter()) {
          <button type="button" class="btn btn-ghost btn-xs p-0" title="Clear search" (click)="table().setGlobalFilter('')">
            <svg lucideX class="size-3.5"></svg>
          </button>
        }
      </label>
      <ng-content />
      <span class="spacer"></span>
      <button type="button" class="btn btn-sm btn-outline" (click)="exportCsv.emit()">
        <svg lucideFileSpreadsheet class="size-4"></svg> Export
      </button>
      @if (addLabel()) {
        <button type="button" class="btn btn-sm btn-primary" (click)="add.emit()">
          <svg lucidePlus class="size-4"></svg> {{ addLabel() }}
        </button>
      }
      <ng-content select="[toolbarEnd]" />
    </div>
  `,
})
export class TableToolbarComponent {
  table = input.required<TableState<any>>();
  searchPlaceholder = input('Search…');
  /* blank = no Add button (the table's rows are fixed) */
  addLabel = input('');
  exportCsv = output<void>();
  add = output<void>();
}
