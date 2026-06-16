// Admin → Materials: table-maintenance screen  for the
// shared material list that feeds the "Material used" dropdown on the Build/install stage.
// Uses PrimeNG's editable table (editMode="row"). Seeded from MATERIALS
// no backend
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { MATERIALS } from '../data/materials';

interface MaterialRow {
  id: string;
  name: string;
}

@Component({
  selector: 'app-admin-materials',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    IconFieldModule, InputIconModule
  ],
  templateUrl: './admin-materials.component.html'
})
export class AdminMaterialsComponent {
  rows: MaterialRow[] = MATERIALS.map(m => ({ id: m, name: m }));

  // Columns the built-in p-table CSV export uses (exportCSV reads `this.columns`).
  exportColumns = [{ field: 'name', header: 'Material' }];

  private messages = inject(MessageService);
  private clonedRows: Record<string, MaterialRow> = {};
  private seq = 0;

  addRow() {
    this.rows = [{ id: `new-${++this.seq}`, name: '' }, ...this.rows];
  }

  deleteRow(index: number) {
    this.rows = this.rows.filter((_, i) => i !== index);
    this.messages.add({ severity: 'info', summary: 'Material deleted', life: 3000 });
  }

  onRowEditInit(row: MaterialRow) {
    this.clonedRows[row.id] = { ...row };
  }

  onRowEditSave(row: MaterialRow) {
    delete this.clonedRows[row.id];
    this.messages.add({ severity: 'success', summary: 'Material saved', detail: row.name, life: 3000 });
  }

  onRowEditCancel(row: MaterialRow, index: number) {
    if (this.clonedRows[row.id]) {
      this.rows[index] = this.clonedRows[row.id];
      delete this.clonedRows[row.id];
    }
  }
}
