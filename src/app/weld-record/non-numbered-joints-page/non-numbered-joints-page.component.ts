/* Non-Numbered Joints: every non-numbered joint in one paged table. The keyword search looks in
   order and interim part number; each column heading sorts and filters. */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideX, LucideFileSpreadsheet } from '@lucide/angular';

import { TableState } from '../../shared/table-state';
import { TablePagerComponent } from '../../shared/table-pager.component';
import { SortHeaderComponent } from '../../shared/sort-header.component';
import { downloadCsv } from '../../shared/export-csv';
import { NON_NUMBERED_JOINTS } from '../../data/non-numbered-joints';
import { NON_NUMBERED_JOINT_COLUMNS, toRow, type NonNumberedJointRow } from './rules/non-numbered-joint-columns';

@Component({
  selector: 'app-non-numbered-joints-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SortHeaderComponent, TablePagerComponent, LucideSearch, LucideX, LucideFileSpreadsheet],
  templateUrl: './non-numbered-joints-page.component.html',
})
export class NonNumberedJointsPageComponent {
  columns = NON_NUMBERED_JOINT_COLUMNS;
  table = new TableState<NonNumberedJointRow>(['order', 'interimPartNumber']);

  constructor() {
    this.table.setRows(NON_NUMBERED_JOINTS.map(toRow));
  }

  cell(row: NonNumberedJointRow, key: keyof NonNumberedJointRow): string {
    return row[key];
  }

  clearAll() {
    this.table.clearFilters();
  }

  hasFilters(): boolean {
    return !!this.table.globalFilter() || Object.values(this.table.columnFilters()).some(v => v.length > 0);
  }

  exportCsv() {
    downloadCsv('non-numbered-joints',
      this.columns.map(c => ({ header: c.label, value: (r: NonNumberedJointRow) => r[c.key] })),
      this.table.sorted());
  }
}
