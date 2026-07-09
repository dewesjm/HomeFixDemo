// Admin → Steps: a table-maintenance screen for the per-trade workflow
// steps. Inline row editing via a per-row `editingId` signal; edits live in memory only.
//No actual backend
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import { TableState, inArray } from '../shared/table-state';
import { MultiselectDropdownComponent } from '../shared/multiselect-dropdown.component';
import { downloadCsv } from '../data/export-csv';
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
    CommonModule, FormsModule, MultiselectDropdownComponent,
    LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-steps.component.html'
})
export class AdminStepsComponent {
  tradeOptions = TRADE_OPTIONS;

  // Flatten the per-trade templates into editable rows.
  rows = signal<StepRow[]>(Object.entries(STAGE_TEMPLATES).flatMap(([trade, templates]) =>
    templates.map(t => ({ id: `${trade}:${t.id}`, step: t.label, trade: trade as Job['trade'] }))
  ));

  table = new TableState<StepRow>(['step', 'trade'], { trade: inArray });
  visibleRows = computed(() => this.table.sorted());

  private messages = inject(ToastService);
  private clonedRows: Record<string, StepRow> = {};
  private seq = 0;

  editingId = signal<string | null>(null);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    const row: StepRow = { id: `new-${++this.seq}`, step: '', trade: this.tradeOptions[0].value };
    this.rows.update(r => [row, ...r]);
    this.editingId.set(row.id);
  }

  deleteRow(row: StepRow) {
    this.rows.update(r => r.filter(x => x.id !== row.id));
    this.messages.add({ severity: 'info', summary: 'Step deleted', life: 3000 });
  }

  startEdit(row: StepRow) {
    this.clonedRows[row.id] = { ...row };
    this.editingId.set(row.id);
  }

  saveEdit(row: StepRow) {
    delete this.clonedRows[row.id];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Step saved', detail: row.step, life: 3000 });
  }

  cancelEdit(row: StepRow) {
    const original = this.clonedRows[row.id];
    if (original) {
      this.rows.update(r => r.map(x => (x.id === row.id ? original : x)));
      delete this.clonedRows[row.id];
    }
    this.editingId.set(null);
  }

  updateField(row: StepRow, field: 'step' | 'trade', value: string) {
    this.rows.update(r => r.map(x => (x.id === row.id ? { ...x, [field]: value } : x)));
  }

  exportCsv() {
    downloadCsv('steps', [
      { header: 'Step', value: (r: StepRow) => r.step },
      { header: 'Trade', value: (r: StepRow) => r.trade }
    ], this.visibleRows());
  }
}
