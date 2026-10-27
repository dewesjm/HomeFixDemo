/* Admin > Attribute Code Exceptions: what each attribute code changes on a joint's routing
   (weld-record/attribute-codes/attribute-code-exceptions.ts); rows are added, edited and removed here */
import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../shared/export-csv';
import { PROGRESSION_ATTRIBUTE_CODES } from '../../../data/attribute-codes';
import { getTemplates } from '../../routing/stage-templates';
import { ConditionRule } from '../../routing/step-conditions';
import { getRoutingSignoffTypes } from '../../signoff-definition/routing-signoff-types';
import { getSignoffTypeRows } from '../../signoff-definition/signoff-types';
import {
  AccessibleAnswer, AttributeCodeException, getAttributeCodeExceptions, setAttributeCodeExceptions,
} from '../../attribute-codes/attribute-code-exceptions';
import {
  accessibleText, appliesWhenText, exceptionConditionFields, minRtText, routingChangeText, typesText,
} from '../../attribute-codes/exception-text';
import { TypeEnableConditionsComponent } from '../admin-signoff-types/type-enable-conditions.component';

interface ExceptionRow extends AttributeCodeException {
  uid: string;
  routingLabel: string;
  message: string;
}

@Component({
  selector: 'app-admin-attribute-code-exceptions',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent, TypeEnableConditionsComponent,
    LucidePencil, LucideCheck, LucideX, LucideTrash2],
  templateUrl: './admin-attribute-code-exceptions.component.html',
})
export class AdminAttributeCodeExceptionsComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private seq = 0;

  readonly codes = PROGRESSION_ATTRIBUTE_CODES;
  /* the routings a row can name: Routing Settings' numbered routings, NQC rows included */
  readonly routings = (getTemplates()['Welding'] ?? [])
    .filter(t => t.classification !== 'added')
    .map(t => ({ id: t.id, label: t.label }));
  readonly typeChoices = getRoutingSignoffTypes();
  readonly conditionFields = exceptionConditionFields();
  readonly text = { appliesWhenText, routingChangeText, typesText, accessibleText, minRtText };

  rows = signal<ExceptionRow[]>(getAttributeCodeExceptions().map(r => this.toRow(r)));
  editingUid = signal<string | null>(null);
  private cloned: Record<string, ExceptionRow> = {};
  table = new TableState<ExceptionRow>(['code', 'routingLabel', 'message']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  private toRow(r: AttributeCodeException): ExceptionRow {
    return { ...structuredClone(r), uid: `ace-${++this.seq}`, routingLabel: this.routingLabel(r.routing), message: this.message(r.code) };
  }

  private routingLabel(id: string): string {
    return !id ? '' : this.routings.find(r => r.id === id)?.label ?? `${id} (not in Routing Settings)`;
  }

  private message(code: string): string {
    return this.codes.find(c => c.code === code)?.description ?? '';
  }

  /* the Types an accessible rule can name: the row's own and the routing's (Signoff Types By Routing) */
  accessibleChoices(row: ExceptionRow): string[] {
    const configured = getSignoffTypeRows().find(r => r.stepId === row.routing)?.types.map(t => t.type) ?? [];
    return [...new Set([...(row.types ?? []), ...configured, ...(row.accessible ?? []).map(a => a.type)])];
  }

  typeName(value: string): string {
    return this.typeChoices.find(t => t.value === value)?.label ?? value;
  }

  accessibleOf(row: ExceptionRow, type: string): string {
    return row.accessible?.find(a => a.type === type)?.answer ?? '';
  }

  setAccessible(row: ExceptionRow, type: string, answer: string) {
    const rest = (row.accessible ?? []).filter(a => a.type !== type);
    row.accessible = answer ? [...rest, { type, answer: answer as AccessibleAnswer }] : rest;
  }

  hasType(row: ExceptionRow, value: string): boolean {
    return !!row.types?.includes(value);
  }

  toggleType(row: ExceptionRow, value: string, on: boolean) {
    row.types = on ? [...(row.types ?? []), value] : (row.types ?? []).filter(t => t !== value);
  }

  setCode(row: ExceptionRow, code: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, code, message: this.message(code) } : x));
  }

  setRouting(row: ExceptionRow, routing: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, routing, routingLabel: this.routingLabel(routing) } : x));
  }

  setWhen(row: ExceptionRow, when: ConditionRule[]) {
    row.when = when;
  }

  exportCsv() {
    downloadCsv('attribute-code-exceptions', [
      { header: 'Code', value: (r: ExceptionRow) => r.code },
      { header: 'Message', value: (r: ExceptionRow) => r.message },
      { header: 'Routing', value: (r: ExceptionRow) => r.routingLabel },
      { header: 'Applies when', value: appliesWhenText },
      { header: 'Routing change', value: routingChangeText },
      { header: 'Types offered', value: typesText },
      { header: 'Type needs ID accessible', value: accessibleText },
      { header: 'Minimum RT', value: minRtText },
    ], this.table.sorted());
  }

  addRow() {
    const row = this.toRow({ code: '', routing: '' });
    this.table.clearFilters();
    this.rows.update(r => [row, ...r]);
    this.editingUid.set(row.uid);
  }

  startEdit(row: ExceptionRow) {
    this.cloned[row.uid] = structuredClone(row);
    this.editingUid.set(row.uid);
  }

  saveEdit(row: ExceptionRow) {
    const current = this.rows().find(r => r.uid === row.uid);
    if (!current?.code || !current.routing) {
      this.messages.add({ severity: 'warn', summary: 'Pick a code and a routing', life: 3000 });
      return;
    }
    delete this.cloned[row.uid];
    this.editingUid.set(null);
    this.persist();
    this.messages.add({ severity: 'success', summary: 'Saved', detail: `${current.code} - ${current.routingLabel}`, life: 3000 });
  }

  cancelEdit(row: ExceptionRow) {
    const original = this.cloned[row.uid];
    this.rows.update(r => original ? r.map(x => x.uid === row.uid ? original : x) : r.filter(x => x.uid !== row.uid));
    delete this.cloned[row.uid];
    this.editingUid.set(null);
  }

  deleteRow(row: ExceptionRow) {
    this.confirm.confirmDelete(`${row.code} - ${row.routingLabel}`, () => {
      this.rows.update(r => r.filter(x => x.uid !== row.uid));
      this.persist();
      this.messages.add({ severity: 'info', summary: 'Deleted', detail: `${row.code} - ${row.routingLabel}`, life: 3000 });
    });
  }

  private persist() {
    const editing = this.editingUid();
    setAttributeCodeExceptions(this.rows().flatMap(r => {
      /* a row still being edited keeps its saved version; an unsaved new row isn't stored */
      const saved = r.uid === editing ? this.cloned[r.uid] : r;
      if (!saved?.code || !saved.routing) return [];
      const { uid: _uid, routingLabel: _label, message: _message, ...row } = saved;
      return [{
        code: row.code, routing: row.routing,
        ...(row.when?.length ? { when: row.when } : {}),
        ...(row.routingChange ? { routingChange: row.routingChange } : {}),
        ...(row.typesMode && row.types?.length ? { typesMode: row.typesMode, types: row.types } : {}),
        ...(row.accessible?.length ? { accessible: row.accessible } : {}),
        ...(row.askAccessible ? { askAccessible: true } : {}),
        ...(row.minRt ? { minRt: Number(row.minRt) } : {}),
      }];
    }));
  }
}
