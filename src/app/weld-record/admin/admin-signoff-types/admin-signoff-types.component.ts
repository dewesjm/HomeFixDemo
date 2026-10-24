import { TypeEnableConditionsComponent } from './type-enable-conditions.component';
import { JOINT_DETAIL_FIELDS } from '../../routing/step-conditions';
/* Admin → Signoff Types By Routing: the seeded table of routing steps that have a Type droplist and
   which Types (Admin > Signoff Types) they offer (weld-record/signoff-definition/signoff-types.ts);
   rows are added and removed here */
import { ExcavationTypeRulesComponent } from './excavation-type-rules.component';
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2, LucideChevronUp, LucideChevronDown } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../shared/export-csv';
import {
  AvailableType,
  SignoffTypeRow,
  EXCAVATION_TYPE_ROW,
  getSignoffTypeRows,
  setSignoffTypeRows,
} from '../../signoff-definition/signoff-types';
import { getRoutingSignoffTypes, typeLabel } from '../../signoff-definition/routing-signoff-types';
import { getTemplates } from '../../routing/stage-templates';

interface TypeRow extends SignoffTypeRow {
  uid: string;
  stepId: string;
  stepLabel: string;
  types: AvailableType[];
}

const EXCAVATION_NOTE = 'Same as the inspection that rejected the joint';

@Component({
  selector: 'app-admin-signoff-types',
  standalone: true,
  imports: [
    TypeEnableConditionsComponent, ExcavationTypeRulesComponent, CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent,
    LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2, LucideChevronUp, LucideChevronDown
  ],
  templateUrl: './admin-signoff-types.component.html'
})
export class AdminSignoffTypesComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private seq = 0;

  readonly excavationId = EXCAVATION_TYPE_ROW;
  readonly excavationNote = EXCAVATION_NOTE;
  /* every routing a row can be for: the Routing Settings routings, then Repair and Excavation NDT */
  readonly steps: { id: string; label: string }[] = [
    ...(getTemplates()['Welding'] ?? []).map(s => ({ id: s.id, label: s.label })),
  ];
  /* what an option can be: the Types in Admin > Signoff Types */
  readonly typeChoices = getRoutingSignoffTypes();

  rows = signal<TypeRow[]>(getSignoffTypeRows().map(r => ({ ...this.toRow(r.stepId, r.types), typeSource: r.typeSource, typeExceptions: r.typeExceptions })));
  editingUid = signal<string | null>(null);
  private cloned: Record<string, TypeRow> = {};
  table = new TableState<TypeRow>(['stepLabel']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  private toRow(stepId: string, types: AvailableType[]): TypeRow {
    return { uid: `st-${++this.seq}`, stepId, stepLabel: this.stepLabel(stepId), types: structuredClone(types) };
  }

  private stepLabel(stepId: string): string {
    if (!stepId) return '';
    return this.steps.find(s => s.id === stepId)?.label ?? `${stepId} (not in Routing Settings)`;
  }

  /* routings without a row yet, plus the row's own */
  stepChoices(row: TypeRow) {
    const used = new Set(this.rows().filter(r => r.uid !== row.uid).map(r => r.stepId));
    return this.steps.filter(s => !used.has(s.id));
  }

  hasDefault(row: TypeRow): boolean {
    return row.types.some(t => t.default);
  }

  /* e.g. "Interim Layer (default)" */
  optionText(t: AvailableType): string {
    return typeLabel(t.type) + (t.default ? ' (default)' : '') + ' — Enable when: ' + this.enableText(t);
  }

  enableText(t: AvailableType): string {
    return t.enableWhen?.length ? t.enableWhen.map(rule => rule.map(c =>
      `${JOINT_DETAIL_FIELDS.find(f => f.key === c.field)?.label ?? (c.field === 'self.returningInspectionType' ? 'Returning inspection Type' : c.field)} ${c.op === 'isNot' ? 'is not' : c.op} ${c.values.map(v => v || 'Blank').join(' or ')}`
    ).join(' AND ')).join(' OR ') : 'Always';
  }

  exportCsv() {
    downloadCsv('signoff-type-availability', [
      { header: 'Routing', value: (r: TypeRow) => r.stepLabel },
      { header: 'Options', value: (r: TypeRow) => r.stepId === EXCAVATION_TYPE_ROW ? EXCAVATION_NOTE
          : r.types.map(t => this.optionText(t)).join('; ') },
    ], this.table.sorted());
  }

  addRow() {
    const row: TypeRow = { uid: `st-${++this.seq}`, stepId: '', stepLabel: '', types: [] };
    this.table.clearFilters();
    this.rows.update(r => [row, ...r]);
    this.editingUid.set(row.uid);
  }

  setStep(row: TypeRow, stepId: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid
      ? { ...x, stepId, stepLabel: this.stepLabel(stepId), types: stepId === EXCAVATION_TYPE_ROW ? [] : x.types }
      : x));
  }

  deleteRow(row: TypeRow) {
    this.confirm.confirmDelete(row.stepLabel, () => {
      this.rows.update(r => r.filter(x => x.uid !== row.uid));
      this.persist();
      this.messages.add({ severity: 'info', summary: 'Deleted', detail: row.stepLabel, life: 3000 });
    });
  }

  startEdit(row: TypeRow) {
    this.cloned[row.uid] = { ...row, types: structuredClone(row.types) };
    this.editingUid.set(row.uid);
  }

  saveEdit(row: TypeRow) {
    const current = this.rows().find(r => r.uid === row.uid);
    if (!current?.stepId) {
      this.messages.add({ severity: 'warn', summary: 'Pick a routing', life: 3000 });
      return;
    }
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, types: x.types.filter(t => t.type) } : x));
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
    row.types.push({ type: '' });
  }

  /* removing the default option leaves the step with no default */
  removeOption(row: TypeRow, idx: number) {
    row.types.splice(idx, 1);
  }

  moveUp(row: TypeRow, idx: number) {
    if (idx <= 0) return;
    const opts = row.types;
    [opts[idx - 1], opts[idx]] = [opts[idx], opts[idx - 1]];
  }

  moveDown(row: TypeRow, idx: number) {
    const opts = row.types;
    if (idx >= opts.length - 1) return;
    [opts[idx], opts[idx + 1]] = [opts[idx + 1], opts[idx]];
  }

  /* idx -1 = No default */
  setDefault(row: TypeRow, idx: number) {
    row.types.forEach((t, i) => { if (i === idx) t.default = true; else delete t.default; });
  }

  reloadTypeRules() {
    const row = getSignoffTypeRows().find(r => r.stepId === EXCAVATION_TYPE_ROW);
    this.rows.update(rows => rows.map(r => r.stepId === EXCAVATION_TYPE_ROW
      ? { ...r, typeSource: row?.typeSource, typeExceptions: row?.typeExceptions } : r));
  }

  private persist() {
    const editing = this.editingUid();
    setSignoffTypeRows(this.rows().flatMap(r => {
      /* a row still being edited keeps its saved version; an unsaved new row isn't stored */
      const saved = r.uid === editing ? this.cloned[r.uid] : r;
      return saved?.stepId ? [{ stepId: saved.stepId, types: saved.types, typeSource: saved.typeSource, typeExceptions: saved.typeExceptions }] : [];
    }));
  }
}
