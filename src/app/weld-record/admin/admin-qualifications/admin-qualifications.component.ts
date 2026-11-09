/* Admin > Qualifications: the conditions that make a step require quals, each an AND/OR group of
   clauses plus the one Signoff Type it applies to, requiring an AND/OR group of quals, and
   the User rows that say which quals a person holds (weld-record/qualifications/qual-conditions.ts). SELF is the testing
   entry the Qualification Check runs as (weld-record/qualifications/qualifications.ts). Each row is edited and saved on its own. */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2 } from '@lucide/angular';
import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../shared/export-csv';
import { ALL_QUALS } from '../../qualifications/qualifications';
import {
  QualCondition, SELF, conditionFields, conditionTypeText, conditionWhenText, heldBy, notOnCheckForm, qualConditions, setQualConditions,
  signoffTypeChoices, signoffTypeLabel, userOf,
} from '../../qualifications/qual-conditions';
import { QualGroup, cloneGroup, pruneGroup, qualsIn, requirementText, termMet } from '../../qualifications/qual-requirements';
import { WhenGroup, cloneWhen, newWhenClause, pruneWhen, whenComplete } from '../../qualifications/qual-when';
import { QualGroupEditorComponent } from './qual-group-editor.component';
import { WhenGroupEditorComponent } from './when-group-editor.component';

interface StoredRow { uid: string; c: QualCondition; isNew: boolean; }
interface ConditionRow extends StoredRow { userRow: boolean; when: string; typeText: string; require: string; notOnForm: string; }

const copy = (c: QualCondition): QualCondition => ({ when: cloneWhen(c.when), require: cloneGroup(c.require), ...(c.type ? { type: c.type } : {}) });

/* names a row in messages */
const rowText = (c: QualCondition) => conditionWhenText(c) || 'Condition';

@Component({
  selector: 'app-admin-qualifications',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent, QualGroupEditorComponent, WhenGroupEditorComponent,
    LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2],
  templateUrl: './admin-qualifications.component.html'
})
export class AdminQualificationsComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private seq = 0;
  allQuals = ALL_QUALS;
  typeChoices = signoffTypeChoices();
  conditions = signal<StoredRow[]>(qualConditions().map((c, i) => ({ uid: `qc-${i}`, c: copy(c), isNew: false })));
  editingId = signal<string | null>(null);
  private cloned: Record<string, StoredRow> = {};

  rows = computed(() => this.conditions().map((r): ConditionRow => {
    const userRow = userOf(r.c) !== null;
    return { ...r, userRow, when: conditionWhenText(r.c), typeText: userRow ? '' : conditionTypeText(r.c),
      require: (userRow ? 'Holds ' : '') + requirementText(r.c.require), notOnForm: notOnCheckForm(r.c).join(', ') };
  }));
  table = new TableState<ConditionRow>(['when', 'typeText', 'require']);

  /* SELF's quals and the requirements they don't meet, as saved */
  selfHeld = computed(() => heldBy(SELF));
  requirementCount = computed(() => qualConditions().filter(c => userOf(c) === null).length);
  failingCount = computed(() => qualConditions().filter(c => userOf(c) === null && !termMet(c.require, this.selfHeld())).length);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  exportCsv() {
    downloadCsv('qual-conditions', [
      { header: 'When', value: (r: ConditionRow) => r.when },
      { header: 'Signoff Type', value: (r: ConditionRow) => r.typeText },
      { header: 'Require', value: (r: ConditionRow) => r.require },
    ], this.table.sorted());
  }

  /* added at the top, with the search cleared, so the new row is in view */
  addCondition() {
    this.closeOpenEdit();
    const when: WhenGroup = { op: 'all', items: [newWhenClause(conditionFields()[0].key)] };
    const uid = `new-${++this.seq}`;
    this.conditions.update(cs => [{ uid, c: { when, require: { op: 'all', items: [] } }, isNew: true }, ...cs]);
    this.table.clearFilters();
    this.table.sortField.set(null);
    this.editingId.set(uid);
  }

  startEdit(row: ConditionRow) {
    this.closeOpenEdit();
    this.cloned[row.uid] = { uid: row.uid, c: copy(row.c), isNew: row.isNew };
    this.editingId.set(row.uid);
  }

  saveEdit(row: ConditionRow) {
    const c: QualCondition = { when: pruneWhen(row.c.when), require: pruneGroup(row.c.require), ...(!row.userRow && row.c.type ? { type: row.c.type } : {}) };
    if (!whenComplete(c.when)) {
      this.messages.add({ severity: 'warn', summary: 'Pick or type a value for every clause', life: 3000 });
      return;
    }
    if (!row.userRow && !c.type) {
      this.messages.add({ severity: 'warn', summary: 'Pick a signoff type', life: 3000 });
      return;
    }
    this.conditions.update(cs => cs.map(x => x.uid === row.uid ? { ...x, c, isNew: false } : x));
    delete this.cloned[row.uid];
    this.editingId.set(null);
    this.persist();
    this.messages.add({ severity: 'success', summary: 'Saved', detail: rowText(c), life: 3000 });
  }

  /* a new row that was never saved goes away */
  cancelEdit(row: { uid: string }) {
    const original = this.cloned[row.uid];
    this.conditions.update(cs => original ? cs.map(x => x.uid === row.uid ? original : x) : cs.filter(x => x.uid !== row.uid));
    delete this.cloned[row.uid];
    this.editingId.set(null);
  }

  /* one row is open at a time: opening or adding another cancels the open one */
  private closeOpenEdit() {
    const id = this.editingId();
    if (id) this.cancelEdit({ uid: id });
  }

  deleteRow(row: ConditionRow) {
    this.confirm.confirmDelete(rowText(row.c), () => {
      this.conditions.update(cs => cs.filter(x => x.uid !== row.uid));
      this.persist();
      this.messages.add({ severity: 'info', summary: 'Deleted', detail: rowText(row.c), life: 3000 });
    });
  }

  /* a row that becomes a User row keeps only a plain list of its quals */
  setWhen(uid: string, when: WhenGroup) {
    this.conditions.update(cs => cs.map(r => {
      if (r.uid !== uid) return r;
      const next = { ...r.c, when };
      return { ...r, c: userOf(next) !== null ? { ...next, require: { op: 'all', items: qualsIn(r.c.require) } } : next };
    }));
  }

  /* a saved Type no longer offered still shows, rather than a blank box */
  typeOptions(row: ConditionRow) {
    const type = row.c.type;
    return !type || this.typeChoices.some(o => o.value === type) ? this.typeChoices : [{ value: type, label: signoffTypeLabel(type) }, ...this.typeChoices];
  }

  setType(uid: string, type: string) {
    this.conditions.update(cs => cs.map(r => r.uid === uid ? { ...r, c: { ...r.c, type } } : r));
  }

  setRequire(uid: string, require: QualGroup) {
    this.conditions.update(cs => cs.map(r => r.uid === uid ? { ...r, c: { ...r.c, require } } : r));
  }

  /* stores every saved row; a row still being edited is stored as it was before the edit, a new one not at all */
  private persist() {
    const saved = this.conditions().flatMap(r => {
      const s = this.cloned[r.uid] ?? r;
      return s.isNew ? [] : [copy(s.c)];
    });
    setQualConditions(saved);
  }
}
