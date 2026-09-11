// Admin → Sign-off Fields: configurable sign-off fields per trade+stage.
// Inline row editing; edits are in-memory only (no backend).
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import { TableState, inArray } from '../shared/table-state';
import { MultiselectDropdownComponent } from '../shared/multiselect-dropdown.component';
import { Job } from '../data/jobs';
import { STAGE_TEMPLATES, SignoffField, defaultSignoffFields, getTemplates, getTradeOptions } from '../data/workflow';

interface SignoffFieldRow {
  id: string;
  trade: Job['trade'];
  stageId: string;
  stageLabel: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  required: boolean;
  placeholder: string;
  optionsText: string;   // comma-separated for inline editing
}

const FIELD_TYPES: { label: string; value: SignoffField['type'] }[] = [
  { label: 'Text', value: 'text' },
  { label: 'Number', value: 'number' },
  { label: 'Select', value: 'select' },
];

function flattenTemplates(): SignoffFieldRow[] {
  const rows: SignoffFieldRow[] = [];
  for (const [trade, templates] of Object.entries(STAGE_TEMPLATES)) {
    for (const t of templates) {
      const fields = t.signoffFields ?? defaultSignoffFields();
      for (const f of fields) {
        rows.push({
          id: `${trade}:${t.id}:${f.key}`,
          trade: trade as Job['trade'],
          stageId: t.id,
          stageLabel: t.label,
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          placeholder: f.placeholder ?? '',
          optionsText: f.options?.map(o => `${o.label}:${o.value}`).join(', ') ?? '',
        });
      }
    }
  }
  return rows;
}

@Component({
  selector: 'app-admin-signoff-fields',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiselectDropdownComponent,
    LucideSearch, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2],
  templateUrl: './admin-signoff-fields.component.html'
})
export class AdminSignoffFieldsComponent {
  tradeOptions = getTradeOptions();
  fieldTypes = FIELD_TYPES;

  rows = signal<SignoffFieldRow[]>(flattenTemplates());
  table = new TableState<SignoffFieldRow>(['trade', 'stageLabel', 'label'], {
    trade: inArray,
    stageLabel: inArray,
  });
  visibleRows = computed(() => this.table.sorted());

  /* distinct stage labels for the stage filter */
  stageOptions = computed(() => {
    const labels = [...new Set(this.rows().map(r => r.stageLabel))].sort();
    return labels.map(l => ({ label: l, value: l }));
  });

  private messages = inject(ToastService);
  private clonedRows: Record<string, SignoffFieldRow> = {};
  private seq = 0;

  editingId = signal<string | null>(null);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    const firstStage = Object.values(STAGE_TEMPLATES)[0]?.[0];
    const row: SignoffFieldRow = {
      id: `new-${++this.seq}`,
      trade: this.tradeOptions[0].value,
      stageId: firstStage?.id ?? 'prep',
      stageLabel: firstStage?.label ?? 'Prep',
      key: '',
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      optionsText: '',
    };
    this.rows.update(r => [row, ...r]);
    this.editingId.set(row.id);
  }

  deleteRow(row: SignoffFieldRow) {
    this.rows.update(r => r.filter(x => x.id !== row.id));
    this.messages.add({ severity: 'info', summary: 'Field deleted', life: 3000 });
  }

  startEdit(row: SignoffFieldRow) {
    this.clonedRows[row.id] = { ...row };
    this.editingId.set(row.id);
  }

  saveEdit(row: SignoffFieldRow) {
    delete this.clonedRows[row.id];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Field saved', detail: row.label, life: 3000 });
  }

  cancelEdit(row: SignoffFieldRow) {
    const original = this.clonedRows[row.id];
    if (original) {
      this.rows.update(r => r.map(x => (x.id === row.id ? original : x)));
      delete this.clonedRows[row.id];
    }
    this.editingId.set(null);
  }

  toggleRequired(row: SignoffFieldRow) {
    this.rows.update(r => r.map(x => (x.id === row.id ? { ...x, required: !x.required } : x)));
  }

  updateField<K extends keyof SignoffFieldRow>(row: SignoffFieldRow, field: K, value: SignoffFieldRow[K]) {
    this.rows.update(r => r.map(x => (x.id === row.id ? { ...x, [field]: value } : x)));
  }

  /* when stage changes, update stageLabel to match */
  onStageChange(row: SignoffFieldRow, stageId: string) {
    const templates = Object.values(STAGE_TEMPLATES).flat();
    const match = templates.find(t => t.id === stageId);
    this.rows.update(r => r.map(x => x.id === row.id ? { ...x, stageId, stageLabel: match?.label ?? stageId } : x));
  }

  /* rebuild a SignoffFieldRow from the flattened list */
  exportToModel(): void {
    // This is a no-op for now — in a real app this would persist to a backend.
    // The rows are the source of truth for the admin view.
    this.messages.add({ severity: 'success', summary: 'Sign-off fields updated', life: 3000 });
  }
}
