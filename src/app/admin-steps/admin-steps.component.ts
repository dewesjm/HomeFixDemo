// Admin → Steps: manage per-trade workflow steps with sequence ordering,
// field configuration (readings + sign-off), and reject routing.
// Persists to localStorage via workflow.ts CRUD functions.
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX,
  LucideTrash2, LucideArrowUp, LucideArrowDown, LucideSettings
} from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import { TooltipDirective } from '../shared/tooltip.directive';
import { TableState, inArray } from '../shared/table-state';
import { MultiselectDropdownComponent } from '../shared/multiselect-dropdown.component';
import { downloadCsv } from '../data/export-csv';
import { Job, addTestJob } from '../data/jobs';
import { Router } from '@angular/router';
import {
  STAGE_TEMPLATES, StageField, SignoffField, defaultSignoffFields,
  addStageTemplate, updateStageTemplate, deleteStageTemplate, addTrade,
  allStageIds, getTemplates, getTradeOptions, ROLES, type Role
} from '../data/workflow';

interface StepRow {
  id: string;
  step: string;
  trade: Job['trade'];
  sequence: number;
  rejectToStage: string;
  role: Role;
}

/* lightweight row model for field config */
interface FieldRow {
  uid: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  required: boolean;
  placeholder: string;
  unit: string;
  optionsText: string;   // "Label:value, Label:value"
}

function toFieldRow(f: StageField | SignoffField, idx: number): FieldRow {
  return {
    uid: `${idx}`,
    key: f.key,
    label: f.label,
    type: f.type,
    required: 'required' in f ? f.required : false,
    placeholder: f.placeholder ?? ('placeholder' in f ? f.placeholder ?? '' : ''),
    unit: 'unit' in f ? (f as any).unit ?? '' : '',
    optionsText: f.options?.map(o => `${o.label}:${o.value}`).join(', ') ?? '',
  };
}

function fieldRowToStageField(r: FieldRow): StageField {
  return {
    key: r.key, label: r.label, type: r.type, placeholder: r.placeholder || undefined,
    unit: r.unit || undefined,
    options: r.type === 'select' ? parseOptions(r.optionsText) : undefined,
  };
}

function fieldRowToSignoffField(r: FieldRow): SignoffField {
  return {
    key: r.key, label: r.label, type: r.type, required: r.required,
    placeholder: r.placeholder || undefined,
    options: r.type === 'select' ? parseOptions(r.optionsText) : undefined,
  };
}

function parseOptions(text: string): { label: string; value: string }[] | undefined {
  if (!text.trim()) return undefined;
  return text.split(',').map(pair => {
    const [label, value] = pair.trim().split(':');
    return { label: (label ?? pair).trim(), value: (value ?? label ?? pair).trim() };
  });
}

@Component({
  selector: 'app-admin-steps',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MultiselectDropdownComponent, TooltipDirective,
    LucideSearch, LucideFileSpreadsheet, LucidePlus, LucidePencil, LucideCheck, LucideX,
    LucideTrash2, LucideArrowUp, LucideArrowDown, LucideSettings
  ],
  templateUrl: './admin-steps.component.html'
})
export class AdminStepsComponent {
  tradeOptions = computed(() => getTradeOptions());
  roleOptions = computed(() => {
    const used = new Set<string>();
    for (const templates of Object.values(getTemplates())) {
      for (const t of templates) {
        if (t.role) used.add(t.role);
      }
    }
    // always include all base roles plus any pipe-delimited combos
    for (const r of ROLES) used.add(r);
    return [...used].sort();
  });
  stageOptions = signal(allStageIds());

  rows = signal<StepRow[]>(this.buildInitialRows());
  table = new TableState<StepRow>(['trade', 'sequence', 'step'], { trade: inArray });
  visibleRows = computed(() => this.table.sorted());

  private messages = inject(ToastService);
  private clonedRows: Record<string, StepRow> = {};
  private seq = 0;

  editingId = signal<string | null>(null);
  newRowId = signal<string | null>(null);  // highlights the newly added row

  // ── Field config dialog ──
  showFieldDlg = signal(false);
  fieldDlgTrade = signal<Job['trade']>('HVAC');
  fieldDlgStageId = signal('');
  fieldDlgStageLabel = signal('');
  readingFields = signal<FieldRow[]>([]);
  signoffFields = signal<FieldRow[]>([]);
  newReadingKey = signal('');
  newReadingLabel = signal('');
  newSignoffKey = signal('');
  newSignoffLabel = signal('');

  // ── New trade dialog ──
  showNewTradeDlg = signal(false);
  newTradeName = signal('');

  // ── Add test job dialog ──
  showTestJobDlg = signal(false);
  testJobTrade = signal('');
  private router = inject(Router);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  private buildInitialRows(): StepRow[] {
    const rows: StepRow[] = [];
    for (const [trade, templates] of Object.entries(getTemplates())) {
      templates.forEach((t, i) => {
        rows.push({
          id: `${trade}:${t.id}`,
          step: t.label,
          trade: trade as Job['trade'],
          sequence: i + 1,
          rejectToStage: t.rejectToStage ?? '',
          role: (t.role as Role) ?? 'View',
        });
      });
    }
    return rows;
  }

  /* ── Row CRUD ── */

  addRow() {
    const trade = this.tradeOptions()[0]?.value ?? 'HVAC';
    const newId = `new-${++this.seq}`;
    const fullId = `${trade}:${newId}`;
    // negative sequence keeps it at the top until saved
    const row: StepRow = { id: fullId, step: '', trade, sequence: -1, rejectToStage: '', role: 'View' };
    this.rows.update(r => [...r, row]);
    this.editingId.set(fullId);
    this.newRowId.set(fullId);
    setTimeout(() => this.newRowId.set(null), 2000);
  }

  deleteRow(row: StepRow) {
    const trade = row.trade;
    const stageId = row.id.split(':')[1];
    deleteStageTemplate(trade, stageId);
    this.rows.update(r => r.filter(x => x.id !== row.id));
    this.resequence(trade);
    this.refreshStageOptions();
    this.messages.add({ severity: 'info', summary: 'Step deleted', life: 3000 });
  }

  startEdit(row: StepRow) {
    this.clonedRows[row.id] = { ...row };
    this.editingId.set(row.id);
  }

  saveEdit(row: StepRow) {
    const parts = row.id.split(':');
    const stageId = parts[1];
    const isNew = stageId.startsWith('new-');

    if (isNew) {
      const newId = `custom-${Date.now()}`;
      addStageTemplate(row.trade, {
        id: newId, label: row.step, required: true, role: row.role,
        fields: [], signoffFields: defaultSignoffFields(), rejectToStage: row.rejectToStage,
      });
      const newFullId = `${row.trade}:${newId}`;
      this.rows.update(r => r.map(x => x.id === row.id ? { ...x, id: newFullId, sequence: 0 } : x));
      this.resequence(row.trade);
    } else {
      updateStageTemplate(row.trade, stageId, {
        label: row.step,
        rejectToStage: row.rejectToStage,
        role: row.role,
      });
    }

    delete this.clonedRows[row.id];
    this.editingId.set(null);
    this.refreshStageOptions();
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

  updateField(row: StepRow, field: 'step' | 'trade' | 'role', value: string) {
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

  /* ── Reorder ── */

  moveUp(row: StepRow) {
    const tradeRows = this.rows().filter(r => r.trade === row.trade).sort((a, b) => a.sequence - b.sequence);
    const idx = tradeRows.findIndex(r => r.id === row.id);
    if (idx <= 0) return;
    const above = tradeRows[idx - 1];
    this.rows.update(rows => rows.map(r => {
      if (r.id === row.id) return { ...r, sequence: above.sequence };
      if (r.id === above.id) return { ...r, sequence: row.sequence };
      return r;
    }));
  }

  moveDown(row: StepRow) {
    const tradeRows = this.rows().filter(r => r.trade === row.trade).sort((a, b) => a.sequence - b.sequence);
    const idx = tradeRows.findIndex(r => r.id === row.id);
    if (idx < 0 || idx >= tradeRows.length - 1) return;
    const below = tradeRows[idx + 1];
    this.rows.update(rows => rows.map(r => {
      if (r.id === row.id) return { ...r, sequence: below.sequence };
      if (r.id === below.id) return { ...r, sequence: row.sequence };
      return r;
    }));
  }

  isFirstInTrade(row: StepRow): boolean {
    const tradeRows = this.rows().filter(r => r.trade === row.trade).sort((a, b) => a.sequence - b.sequence);
    return tradeRows[0]?.id === row.id;
  }
  isLastInTrade(row: StepRow): boolean {
    const tradeRows = this.rows().filter(r => r.trade === row.trade).sort((a, b) => a.sequence - b.sequence);
    return tradeRows[tradeRows.length - 1]?.id === row.id;
  }

  getRejectLabel(rejectToStage: string): string {
    if (!rejectToStage) return '—';
    const match = this.stageOptions().find(s => s.id === rejectToStage);
    return match?.label ?? rejectToStage;
  }

  private resequence(trade: Job['trade']) {
    const sorted = this.rows().filter(r => r.trade === trade).sort((a, b) => a.sequence - b.sequence);
    this.rows.update(rows => rows.map(r => {
      if (r.trade !== trade) return r;
      const idx = sorted.findIndex(s => s.id === r.id);
      return { ...r, sequence: idx + 1 };
    }));
  }

  private refreshStageOptions() {
    // force recomputation — signal won't change if underlying data has same ids,
    // but the allStageIds() call will re-read from localStorage
    this.stageOptions.set(allStageIds());
  }

  /* ── Field config dialog ── */

  openFieldConfig(row: StepRow) {
    const trade = row.trade;
    const stageId = row.id.split(':')[1];
    const templates = getTemplates();
    const stage = templates[trade]?.find(t => t.id === stageId);

    this.fieldDlgTrade.set(trade);
    this.fieldDlgStageId.set(stageId);
    this.fieldDlgStageLabel.set(row.step);
    this.readingFields.set((stage?.fields ?? []).map(toFieldRow));
    this.signoffFields.set((stage?.signoffFields ?? defaultSignoffFields()).map(toFieldRow));
    this.newReadingKey.set('');
    this.newReadingLabel.set('');
    this.newSignoffKey.set('');
    this.newSignoffLabel.set('');
    this.showFieldDlg.set(true);
  }

  /* reading fields */
  addReadingField() {
    const key = this.newReadingKey().trim();
    const label = this.newReadingLabel().trim() || key;
    if (!key) return;
    this.readingFields.update(f => [...f, { uid: `${Date.now()}`, key, label, type: 'text', required: false, placeholder: '', unit: '', optionsText: '' }]);
    this.newReadingKey.set('');
    this.newReadingLabel.set('');
  }
  removeReadingField(uid: string) {
    this.readingFields.update(f => f.filter(x => x.uid !== uid));
  }
  updateReadingField(uid: string, patch: Partial<FieldRow>) {
    this.readingFields.update(f => f.map(x => x.uid === uid ? { ...x, ...patch } : x));
  }

  /* signoff fields */
  addSignoffField() {
    const key = this.newSignoffKey().trim();
    const label = this.newSignoffLabel().trim() || key;
    if (!key) return;
    this.signoffFields.update(f => [...f, { uid: `${Date.now()}`, key, label, type: 'text', required: false, placeholder: '', unit: '', optionsText: '' }]);
    this.newSignoffKey.set('');
    this.newSignoffLabel.set('');
  }
  removeSignoffField(uid: string) {
    this.signoffFields.update(f => f.filter(x => x.uid !== uid));
  }
  updateSignoffField(uid: string, patch: Partial<FieldRow>) {
    this.signoffFields.update(f => f.map(x => x.uid === uid ? { ...x, ...patch } : x));
  }

  saveFieldConfig() {
    const trade = this.fieldDlgTrade();
    const stageId = this.fieldDlgStageId();
    updateStageTemplate(trade, stageId, {
      fields: this.readingFields().map(fieldRowToStageField),
      signoffFields: this.signoffFields().map(fieldRowToSignoffField),
    });
    this.showFieldDlg.set(false);
    this.messages.add({ severity: 'success', summary: 'Fields saved', life: 3000 });
  }

  /* ── New trade ── */

  openNewTrade() {
    this.newTradeName.set('');
    this.showNewTradeDlg.set(true);
  }

  saveNewTrade() {
    const name = this.newTradeName().trim();
    if (!name) return;
    // capitalize first letter
    const trade = name.charAt(0).toUpperCase() + name.slice(1) as Job['trade'];
    addTrade(trade);
    // add rows for the new trade's default stages
    const templates = getTemplates()[trade] ?? [];
    const newRows: StepRow[] = templates.map((t, i) => ({
      id: `${trade}:${t.id}`,
      step: t.label,
      trade,
      sequence: i + 1,
      rejectToStage: t.rejectToStage ?? '',
      role: (t.role as Role) ?? 'View',
    }));
    this.rows.update(r => [...r, ...newRows]);
    this.refreshStageOptions();
    this.showNewTradeDlg.set(false);
    this.messages.add({ severity: 'success', summary: 'Trade added', detail: trade, life: 3000 });
  }

  // ── Add test job dialog ──
  openTestJobDlg() {
    this.testJobTrade.set(this.tradeOptions()[0]?.value ?? '');
    this.showTestJobDlg.set(true);
  }
  createTestJob() {
    const trade = this.testJobTrade();
    if (!trade) return;
    const job = addTestJob(trade);
    this.showTestJobDlg.set(false);
      this.messages.add({ severity: 'success', summary: 'Test project created', detail: `${job.title} (#${job.id})`, life: 3000 });
    this.router.navigate(['/jobs', job.id]);
  }

  /* ── CSV export ── */

  exportCsv() {
    downloadCsv('steps', [
      { header: 'Order', value: (r: StepRow) => r.sequence },
      { header: 'Step', value: (r: StepRow) => r.step },
      { header: 'Trade', value: (r: StepRow) => r.trade },
      { header: 'Reject routes to', value: (r: StepRow) => r.rejectToStage || 'None' }
    ], this.visibleRows());
  }
}
