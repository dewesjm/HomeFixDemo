/* Admin → Signoff Type Availability: the seeded table of routing steps that have a Type droplist and
   their options (data/workflow/signoff-types.ts); rows are added and removed here */
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2, LucideChevronUp, LucideChevronDown } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';
import {
  EXCAVATION_TYPE_ROW, REPAIR_TYPE_ROW, getSignoffTypeRows, getTemplates, setSignoffTypeRows, type StageOption
} from '../../../data/workflow';

interface TypeRow {
  uid: string;
  stepId: string;
  stepLabel: string;
  options: StageOption[];
}

const EXCAVATION_NOTE = 'Same as the inspection that rejected the joint';

/* a repeatable Type records the signoff but leaves the routing where it is (StageOption.repeatable) */
const REPEAT_CHOICES: { value: '' | 'keep' | 'blank'; label: string }[] = [
  { value: '', label: 'No' },
  { value: 'keep', label: 'Yes, keep values' },
  { value: 'blank', label: 'Yes, start blank' },
];

@Component({
  selector: 'app-admin-signoff-types',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent,
    LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2, LucideChevronUp, LucideChevronDown
  ],
  templateUrl: './admin-signoff-types.component.html'
})
export class AdminSignoffTypesComponent {
  private messages = inject(ToastService);
  private seq = 0;

  readonly excavationId = EXCAVATION_TYPE_ROW;
  readonly excavationNote = EXCAVATION_NOTE;
  readonly repeatChoices = REPEAT_CHOICES;
  /* every step a row can be for: the Routing Settings steps, then Repair and Excavation NDT */
  readonly steps: { id: string; label: string }[] = [
    ...(getTemplates()['Welding'] ?? []).map(s => ({ id: s.id, label: s.label })),
    { id: REPAIR_TYPE_ROW, label: 'Repair' },
    { id: EXCAVATION_TYPE_ROW, label: 'Excavation NDT' },
  ];

  rows = signal<TypeRow[]>(getSignoffTypeRows().map(r => this.toRow(r.stepId, r.options)));
  editingUid = signal<string | null>(null);
  private cloned: Record<string, TypeRow> = {};
  table = new TableState<TypeRow>(['stepLabel']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  private toRow(stepId: string, options: StageOption[]): TypeRow {
    return { uid: `st-${++this.seq}`, stepId, stepLabel: this.stepLabel(stepId), options: options.map(o => ({ ...o })) };
  }

  private stepLabel(stepId: string): string {
    if (!stepId) return '';
    return this.steps.find(s => s.id === stepId)?.label ?? `${stepId} (not in Routing Settings)`;
  }

  /* steps without a row yet, plus the row's own step */
  stepChoices(row: TypeRow) {
    const used = new Set(this.rows().filter(r => r.uid !== row.uid).map(r => r.stepId));
    return this.steps.filter(s => !used.has(s.id));
  }

  hasDefault(row: TypeRow): boolean {
    return row.options.some(o => o.default);
  }

  /* e.g. "Interim Layer (default, repeatable, keeps values)" */
  optionText(o: StageOption): string {
    const notes = [
      ...(o.default ? ['default'] : []),
      ...(o.repeatable === 'keep' ? ['repeatable, keeps values'] : o.repeatable === 'blank' ? ['repeatable, starts blank'] : []),
    ];
    return notes.length ? `${o.label} (${notes.join(', ')})` : o.label;
  }

  setRepeatable(o: StageOption, value: '' | 'keep' | 'blank') {
    if (value) o.repeatable = value; else delete o.repeatable;
  }

  exportCsv() {
    downloadCsv('signoff-type-availability', [
      { header: 'Routing Step', value: (r: TypeRow) => r.stepLabel },
      { header: 'Options', value: (r: TypeRow) => r.stepId === EXCAVATION_TYPE_ROW ? EXCAVATION_NOTE
          : r.options.map(o => this.optionText(o)).join('; ') },
    ], this.table.sorted());
  }

  addRow() {
    const row: TypeRow = { uid: `st-${++this.seq}`, stepId: '', stepLabel: '', options: [] };
    this.table.clearFilters();
    this.rows.update(r => [row, ...r]);
    this.editingUid.set(row.uid);
  }

  setStep(row: TypeRow, stepId: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid
      ? { ...x, stepId, stepLabel: this.stepLabel(stepId), options: stepId === EXCAVATION_TYPE_ROW ? [] : x.options }
      : x));
  }

  deleteRow(row: TypeRow) {
    this.rows.update(r => r.filter(x => x.uid !== row.uid));
    this.persist();
    this.messages.add({ severity: 'info', summary: 'Deleted', detail: row.stepLabel, life: 3000 });
  }

  startEdit(row: TypeRow) {
    this.cloned[row.uid] = { ...row, options: row.options.map(o => ({ ...o })) };
    this.editingUid.set(row.uid);
  }

  saveEdit(row: TypeRow) {
    const current = this.rows().find(r => r.uid === row.uid);
    if (!current?.stepId) {
      this.messages.add({ severity: 'warn', summary: 'Pick a routing step', life: 3000 });
      return;
    }
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, options: x.options.filter(o => o.label.trim()) } : x));
    delete this.cloned[row.uid];
    this.editingUid.set(null);
    this.persist();
    this.messages.add({ severity: 'success', summary: 'Saved', detail: current.stepLabel, life: 3000 });
  }

  cancelEdit(row: TypeRow) {
    const original = this.cloned[row.uid];
    this.rows.update(r => original ? r.map(x => x.uid === row.uid ? original : x) : r.filter(x => x.uid !== row.uid));
    delete this.cloned[row.uid];
    this.editingUid.set(null);
  }

  addOption(row: TypeRow) {
    row.options.push({ label: '', value: '' });
  }

  /* removing the default option leaves the step with no default */
  removeOption(row: TypeRow, idx: number) {
    row.options.splice(idx, 1);
  }

  moveUp(row: TypeRow, idx: number) {
    if (idx <= 0) return;
    const opts = row.options;
    [opts[idx - 1], opts[idx]] = [opts[idx], opts[idx - 1]];
  }

  moveDown(row: TypeRow, idx: number) {
    const opts = row.options;
    if (idx >= opts.length - 1) return;
    [opts[idx], opts[idx + 1]] = [opts[idx + 1], opts[idx]];
  }

  /* idx -1 = No default */
  setDefault(row: TypeRow, idx: number) {
    row.options.forEach((o, i) => { if (i === idx) o.default = true; else delete o.default; });
  }

  private persist() {
    const editing = this.editingUid();
    setSignoffTypeRows(this.rows().flatMap(r => {
      /* a row still being edited keeps its saved version; an unsaved new row isn't stored */
      const saved = r.uid === editing ? this.cloned[r.uid] : r;
      return saved?.stepId ? [{ stepId: saved.stepId, options: saved.options }] : [];
    }));
  }
}
