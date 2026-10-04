/* One sortable, searchable table for a stage of the load (Converted, Processed, Weld Joints, Load Runs,
   Error Log). Columns are described by the caller; rows are flat objects from data/external-loads/table-rows.ts. */
import { Component, computed, effect, input, output } from '@angular/core';
import { LucideSearch } from '@lucide/angular';

import { TableState, inArray } from '../../shared/table-state';
import { TableToolbarComponent } from '../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../shared/sort-header.component';
import { SelectOption } from '../../shared/multiselect-dropdown.component';
import { AppDateTimePipe, formatDateTime } from '../../shared/date-format';
import { downloadCsv } from '../../data/export-csv';
import { FlatRow } from '../../data/external-loads/table-rows';

export interface StageColumn {
  field: string;
  label: string;
  filter?: 'text' | 'select';
  mono?: boolean;
  /* long text: let it wrap in a wider column */
  wide?: boolean;
  dateTime?: boolean;
  /* value -> DaisyUI badge class, shows the value as a badge */
  badges?: Record<string, string>;
  /* value -> text class, e.g. errors in red */
  textClass?: string;
}

@Component({
  selector: 'app-stage-table',
  standalone: true,
  imports: [TableToolbarComponent, SortHeaderComponent, AppDateTimePipe, LucideSearch],
  template: `
    <app-table-toolbar [table]="table()" [searchPlaceholder]="searchPlaceholder()" (exportCsv)="exportCsv()" />
    <div style="overflow-x: auto">
      <table class="table table-sm">
        <thead>
          <tr>
            @if (lookup()) { <th class="min-w-11"></th> }
            @for (c of columns(); track c.field) {
              <th appSortHeader [class]="c.wide ? 'min-w-64' : 'min-w-24'" [table]="table()" [field]="c.field" [label]="c.label"
                  [filter]="c.filter ?? 'none'" [options]="optionsFor(c)"></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of table().sorted(); track $index) {
            <tr>
              @if (lookup()) {
                <td>
                  <button type="button" class="btn btn-ghost btn-xs" title="Look up this joint in every stage"
                          (click)="lookupRow.emit(row)">
                    <svg lucideSearch class="size-4"></svg>
                  </button>
                </td>
              }
              @for (c of columns(); track c.field) {
                <td [class.mono]="c.mono" [class]="c.textClass ?? ''">
                  @if (c.badges) {
                    @if (row[c.field]) {
                      <span class="badge badge-sm whitespace-nowrap" [class]="c.badges[$any(row[c.field])] ?? 'badge-ghost'">{{ row[c.field] }}</span>
                    }
                  } @else if (c.dateTime) {
                    {{ $any(row[c.field]) | appDateTime }}
                  } @else {
                    {{ row[c.field] }}
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr><td [attr.colspan]="columns().length + (lookup() ? 1 : 0)" class="empty">No rows match.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class StageTableComponent {
  rows = input.required<FlatRow[]>();
  columns = input.required<StageColumn[]>();
  searchPlaceholder = input('Search…');
  csvName = input('external-load');
  /* shows a look-up button on each row */
  lookup = input(false);
  lookupRow = output<FlatRow>();

  table = computed(() => new TableState<FlatRow>(
    this.columns().map(c => c.field),
    Object.fromEntries(this.columns().filter(c => c.filter === 'select').map(c => [c.field, inArray])),
  ));

  constructor() {
    effect(() => this.table().setRows(this.rows()));
  }

  optionsFor(c: StageColumn): SelectOption[] {
    if (c.filter !== 'select') return [];
    const values = [...new Set(this.rows().map(r => String(r[c.field] ?? '')))].filter(v => v).sort();
    return values.map(v => ({ label: v, value: v }));
  }

  exportCsv() {
    downloadCsv(this.csvName(), this.columns().map(c => ({
      header: c.label,
      value: (r: FlatRow) => (c.dateTime ? formatDateTime(r[c.field] as Date) : (r[c.field] as string | number | null)),
    })), this.table().sorted());
  }
}
