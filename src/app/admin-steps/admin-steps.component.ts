// Admin → Steps: a table-maintenance screen (à la SAP SM30) for the per-trade workflow
// steps. Uses PrimeNG's editable table (editMode="row" + p-cellEditor). Seeded from
// STAGE_TEMPLATES; edits live in memory only (no backend wired in this demo).
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { Job, TRADE_OPTIONS } from '../data/jobs';
import { STAGE_TEMPLATES } from '../data/workflow';

interface StepRow {
  id: string;
  step: string;
  trade: Job['trade'];
}

@Component({
  selector: 'app-admin-steps',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, SelectModule,
    MultiSelectModule, IconFieldModule, InputIconModule
  ],
  templateUrl: './admin-steps.component.html'
})
export class AdminStepsComponent {
  tradeOptions = TRADE_OPTIONS;

  // Flatten the per-trade templates into editable rows.
  rows: StepRow[] = Object.entries(STAGE_TEMPLATES).flatMap(([trade, templates]) =>
    templates.map(t => ({ id: `${trade}:${t.id}`, step: t.label, trade: trade as Job['trade'] }))
  );

  private clonedRows: Record<string, StepRow> = {};
  private seq = 0;

  addRow() {
    const row: StepRow = { id: `new-${++this.seq}`, step: '', trade: this.tradeOptions[0].value };
    this.rows = [row, ...this.rows];
  }

  deleteRow(index: number) {
    this.rows = this.rows.filter((_, i) => i !== index);
  }

  onRowEditInit(row: StepRow) {
    this.clonedRows[row.id] = { ...row };
  }

  onRowEditSave(row: StepRow) {
    delete this.clonedRows[row.id];
  }

  onRowEditCancel(row: StepRow, index: number) {
    if (this.clonedRows[row.id]) {
      this.rows[index] = this.clonedRows[row.id];
      delete this.clonedRows[row.id];
    }
  }
}
