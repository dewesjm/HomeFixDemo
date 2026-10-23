/* Admin > Signoff Types: names and which routing each Type signs. */
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
import { RoutingSignoffType, getRoutingSignoffTypes, setRoutingSignoffTypes } from '../../signoff-definition/routing-signoff-types';
import { getTemplates } from '../../routing/stage-templates';

interface TypeRow extends RoutingSignoffType {
  uid: string;
}

@Component({
  selector: 'app-admin-routing-signoff-types',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent, LucidePencil, LucideCheck, LucideX, LucideTrash2],
  templateUrl: './admin-routing-signoff-types.component.html'
})
export class AdminRoutingSignoffTypesComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private seq = 0;

  /* what Signs routing can name: the Routing Settings routings */
  readonly routings = (getTemplates()['Welding'] ?? []).map(s => ({ id: s.id, label: s.label }));

  rows = signal<TypeRow[]>(getRoutingSignoffTypes().map(t => this.toRow(t)));
  editingUid = signal<string | null>(null);
  private cloned: Record<string, TypeRow> = {};
  table = new TableState<TypeRow>(['label']);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  private toRow(t: RoutingSignoffType): TypeRow {
    return { ...t, uid: `rst-${++this.seq}` };
  }

  signsStepLabel(row: TypeRow): string {
    if (!row.signsStep) return '';
    return this.routings.find(s => s.id === row.signsStep)?.label ?? `${row.signsStep} (not in Routing Settings)`;
  }

  exportCsv() {
    downloadCsv('routing-signoff-types', [
      { header: 'Type', value: (r: TypeRow) => r.label },
      { header: 'Signs routing', value: (r: TypeRow) => this.signsStepLabel(r) },
    ], this.table.sorted());
  }

  addRow() {
    const row: TypeRow = { uid: `rst-${++this.seq}`, label: '', value: '' };
    this.table.clearFilters();
    this.rows.update(r => [row, ...r]);
    this.editingUid.set(row.uid);
  }

  startEdit(row: TypeRow) {
    this.cloned[row.uid] = { ...row };
    this.editingUid.set(row.uid);
  }

  /* a new Type's stored value is made from its name when saved; renaming keeps the value, so steps
     and the definition stay matched */
  saveEdit(row: TypeRow) {
    const label = row.label.trim();
    if (!label) {
      this.messages.add({ severity: 'warn', summary: 'Enter a name', life: 3000 });
      return;
    }
    if (this.rows().some(r => r.uid !== row.uid && r.label.trim().toLowerCase() === label.toLowerCase())) {
      this.messages.add({ severity: 'warn', summary: 'A type with that name already exists', life: 3000 });
      return;
    }
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, label } : x));
    delete this.cloned[row.uid];
    this.editingUid.set(null);
    this.persist();
    this.messages.add({ severity: 'success', summary: 'Saved', detail: label, life: 3000 });
  }

  cancelEdit(row: TypeRow) {
    const original = this.cloned[row.uid];
    this.rows.update(r => original ? r.map(x => x.uid === row.uid ? original : x) : r.filter(x => x.uid !== row.uid));
    delete this.cloned[row.uid];
    this.editingUid.set(null);
  }

  /* a deleted Type drops out of every step that offered it */
  deleteRow(row: TypeRow) {
    this.confirm.confirmDelete(`${row.label} (removed from every routing that offers it)`, () => {
      this.rows.update(r => r.filter(x => x.uid !== row.uid));
      this.persist();
      this.messages.add({ severity: 'info', summary: 'Deleted', detail: row.label, life: 3000 });
    });
  }

  /* '' = the step it's picked on */
  setSignsStep(row: TypeRow, stepId: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? withFlag(x, 'signsStep', stepId || undefined) : x));
  }

  private persist() {
    const editing = this.editingUid();
    setRoutingSignoffTypes(this.rows().flatMap(r => {
      /* a row still being edited keeps its saved version; an unsaved new row isn't stored */
      const saved = r.uid === editing ? this.cloned[r.uid] : r;
      if (!saved) return [];
      const { uid: _, ...type } = saved;
      return [type];
    }));
    this.rows.set(getRoutingSignoffTypes().map(t => this.toRow(t)));
  }
}

/* the Type with the setting on, or left off when unset */
function withFlag(row: TypeRow, key: 'signsStep', value: string | undefined): TypeRow {
  const copy: TypeRow = { ...row };
  if (value === undefined) delete copy[key]; else Object.assign(copy, { [key]: value });
  return copy;
}
