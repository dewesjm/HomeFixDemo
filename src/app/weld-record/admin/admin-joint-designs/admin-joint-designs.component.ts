import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { TableState } from '../../../shared/table-state';
import { downloadCsv } from '../../../data/export-csv';
import { JointDesignEntry, jointDesigns, setJointDesigns } from '../../../data/joint-designs';

@Component({
  selector: 'app-admin-joint-designs',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2
  ],
  templateUrl: './admin-joint-designs.component.html'
})
export class AdminJointDesignsComponent {
  rows = signal<JointDesignEntry[]>(jointDesigns().map(j => ({ ...j })));

  table = new TableState<JointDesignEntry>(['code', 'label']);
  visibleRows = computed(() => this.table.sorted());

  private messages = inject(ToastService);
  private clonedRows: Record<string, JointDesignEntry> = {};
  private seq = 0;

  editingId = signal<string | null>(null);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    const row: JointDesignEntry = { code: `new-${++this.seq}`, label: '', requiresConsumableInsert: false, requiresBackingRing: false };
    this.rows.update(r => [row, ...r]);
    this.editingId.set(row.code);
  }

  deleteRow(row: JointDesignEntry) {
    this.rows.update(r => r.filter(x => x.code !== row.code));
    this.persist();
    this.messages.add({ severity: 'info', summary: 'Joint design deleted', life: 3000 });
  }

  startEdit(row: JointDesignEntry) {
    this.clonedRows[row.code] = { ...row };
    this.editingId.set(row.code);
  }

  saveEdit(row: JointDesignEntry) {
    delete this.clonedRows[row.code];
    this.persist();
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Joint design saved', detail: row.label, life: 3000 });
  }

  cancelEdit(row: JointDesignEntry) {
    const original = this.clonedRows[row.code];
    if (original) {
      this.rows.update(r => r.map(x => (x.code === row.code ? original : x)));
      delete this.clonedRows[row.code];
    }
    this.editingId.set(null);
  }

  updateField(row: JointDesignEntry, field: keyof JointDesignEntry, value: string | boolean) {
    this.rows.update(r => r.map(x => (x.code === row.code ? { ...x, [field]: value } : x)));
  }

  private persist() {
    setJointDesigns(this.rows().map(r => ({ ...r })));
  }

  exportCsv() {
    downloadCsv('joint-designs', [
      { header: 'Code', value: (r: JointDesignEntry) => r.code },
      { header: 'Label', value: (r: JointDesignEntry) => r.label },
      { header: 'Consumable Insert Required', value: (r: JointDesignEntry) => r.requiresConsumableInsert ? 'Yes' : 'No' },
      { header: 'Backing Ring Required', value: (r: JointDesignEntry) => r.requiresBackingRing ? 'Yes' : 'No' },
    ], this.visibleRows());
  }
}
