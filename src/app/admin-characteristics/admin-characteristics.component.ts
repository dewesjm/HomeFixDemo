// Admin → Characteristic Codes: table-maintenance screen (like Admin → Steps) for the
// shared code → description lookup. Uses PrimeNG's editable table (editMode="row").
// Seeded from CHARACTERISTIC_CODES; edits live in memory only (no backend in this demo).
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { CHARACTERISTIC_CODES } from '../data/characteristics';

interface CodeRow {
  id: string;
  code: string;
  description: string;
}

@Component({
  selector: 'app-admin-characteristics',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    IconFieldModule, InputIconModule
  ],
  templateUrl: './admin-characteristics.component.html'
})
export class AdminCharacteristicsComponent {
  rows: CodeRow[] = CHARACTERISTIC_CODES.map(c => ({ id: c.code, code: c.code, description: c.description }));

  // Columns the built-in p-table CSV export uses (exportCSV reads `this.columns`).
  exportColumns = [
    { field: 'code', header: 'Code' },
    { field: 'description', header: 'Description' }
  ];

  private messages = inject(MessageService);
  private clonedRows: Record<string, CodeRow> = {};
  private seq = 0;

  addRow() {
    this.rows = [{ id: `new-${++this.seq}`, code: '', description: '' }, ...this.rows];
  }

  deleteRow(index: number) {
    this.rows = this.rows.filter((_, i) => i !== index);
    this.messages.add({ severity: 'info', summary: 'Code deleted', life: 3000 });
  }

  onRowEditInit(row: CodeRow) {
    this.clonedRows[row.id] = { ...row };
  }

  onRowEditSave(row: CodeRow) {
    delete this.clonedRows[row.id];
    this.messages.add({ severity: 'success', summary: 'Code saved', detail: row.code, life: 3000 });
  }

  onRowEditCancel(row: CodeRow, index: number) {
    if (this.clonedRows[row.id]) {
      this.rows[index] = this.clonedRows[row.id];
      delete this.clonedRows[row.id];
    }
  }
}
