// Admin → Steps: a table-maintenance screen for the per-trade workflow
// steps. Inline row editing via a per-row `editingId` signal; edits live in memory only.
// Includes sequence ordering — steps are ordered by (trade, sequence) and can be
// moved up/down within a trade.
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX,
  LucideTrash2, LucideArrowUp, LucideArrowDown
} from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import { TableState, inArray } from '../shared/table-state';
import { MultiselectDropdownComponent } from '../shared/multiselect-dropdown.component';
import { downloadCsv } from '../data/export-csv';
import { Job, TRADE_OPTIONS } from '../data/jobs';
import { STAGE_TEMPLATES, allStageIds } from '../data/workflow';

interface StepRow {
  id: string;
  step: string;
  trade: Job['trade'];
  sequence: number;
  rejectToStage: string;   /* stage id to route back to on reject */
}

@Component({
  selector: 'app-admin-steps',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MultiselectDropdownComponent,
    LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX,
    LucideTrash2, LucideArrowUp, LucideArrowDown
  ],
  templateUrl: './admin-steps.component.html'
})
export class AdminStepsComponent {
  tradeOptions = TRADE_OPTIONS;
  stageOptions = allStageIds();

  // Flatten the per-trade templates into editable rows, assigning sequence from template order.
  rows = signal<StepRow[]>(this.buildInitialRows());

  table = new TableState<StepRow>(['trade', 'sequence', 'step'], { trade: inArray });
  visibleRows = computed(() => this.table.sorted());

  private messages = inject(ToastService);
  private clonedRows: Record<string, StepRow> = {};
  private seq = 0;

  editingId = signal<string | null>(null);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  private buildInitialRows(): StepRow[] {
    const rows: StepRow[] = [];
    for (const [trade, templates] of Object.entries(STAGE_TEMPLATES)) {
      templates.forEach((t, i) => {
        rows.push({
          id: `${trade}:${t.id}`,
          step: t.label,
          trade: trade as Job['trade'],
          sequence: i + 1,
          rejectToStage: t.rejectToStage ?? '',
        });
      });
    }
    return rows;
  }

  addRow() {
    const maxSeq = Math.max(0, ...this.rows().filter(r => r.trade === this.tradeOptions[0].value).map(r => r.sequence));
    const row: StepRow = {
      id: `new-${++this.seq}`,
      step: '',
      trade: this.tradeOptions[0].value,
      sequence: maxSeq + 1,
      rejectToStage: '',
    };
    this.rows.update(r => [...r, row]);
    this.editingId.set(row.id);
  }

  deleteRow(row: StepRow) {
    this.rows.update(r => r.filter(x => x.id !== row.id));
    this.resequence(row.trade);
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
    if (field === 'trade') {
      const oldTrade = row.trade;
      this.rows.update(r => r.map(x => x.id === row.id ? { ...x, [field]: value as Job['trade'] } : x));
      this.resequence(oldTrade);
      this.resequence(value as Job['trade']);
    } else {
      this.rows.update(r => r.map(x => x.id === row.id ? { ...x, [field]: value } : x));
    }
  }

  updateRejectTo(row: StepRow, value: string) {
    this.rows.update(r => r.map(x => x.id === row.id ? { ...x, rejectToStage: value } : x));
  }

  moveUp(row: StepRow) {
    const tradeRows = this.rows()
      .filter(r => r.trade === row.trade)
      .sort((a, b) => a.sequence - b.sequence);
    const idx = tradeRows.findIndex(r => r.id === row.id);
    if (idx <= 0) return;
    // swap sequence with the row above
    const above = tradeRows[idx - 1];
    const rows = this.rows();
    this.rows.set(rows.map(r => {
      if (r.id === row.id) return { ...r, sequence: above.sequence };
      if (r.id === above.id) return { ...r, sequence: row.sequence };
      return r;
    }));
  }

  moveDown(row: StepRow) {
    const tradeRows = this.rows()
      .filter(r => r.trade === row.trade)
      .sort((a, b) => a.sequence - b.sequence);
    const idx = tradeRows.findIndex(r => r.id === row.id);
    if (idx < 0 || idx >= tradeRows.length - 1) return;
    const below = tradeRows[idx + 1];
    const rows = this.rows();
    this.rows.set(rows.map(r => {
      if (r.id === row.id) return { ...r, sequence: below.sequence };
      if (r.id === below.id) return { ...r, sequence: row.sequence };
      return r;
    }));
  }

  /* can the row move up/down within its trade? */
  isFirstInTrade(row: StepRow): boolean {
    const tradeRows = this.rows()
      .filter(r => r.trade === row.trade)
      .sort((a, b) => a.sequence - b.sequence);
    return tradeRows[0]?.id === row.id;
  }
  isLastInTrade(row: StepRow): boolean {
    const tradeRows = this.rows()
      .filter(r => r.trade === row.trade)
      .sort((a, b) => a.sequence - b.sequence);
    return tradeRows[tradeRows.length - 1]?.id === row.id;
  }

  /* re-number sequence contiguously (1, 2, 3…) for a trade after add/delete */
  private resequence(trade: Job['trade']) {
    const sorted = this.rows()
      .filter(r => r.trade === trade)
      .sort((a, b) => a.sequence - b.sequence);
    this.rows.update(rows =>
      rows.map(r => {
        if (r.trade !== trade) return r;
        const idx = sorted.findIndex(s => s.id === r.id);
        return { ...r, sequence: idx + 1 };
      })
    );
  }

  exportCsv() {
    downloadCsv('steps', [
      { header: 'Order', value: (r: StepRow) => r.sequence },
      { header: 'Step', value: (r: StepRow) => r.step },
      { header: 'Trade', value: (r: StepRow) => r.trade },
      { header: 'Reject routes to', value: (r: StepRow) => r.rejectToStage || 'None' }
    ], this.visibleRows());
  }
}
