/* Admin > Qualifications: the conditions that make a step require quals, each an AND/OR group of
   clauses requiring an AND/OR group of quals, and
   the User rows that say which quals a person holds (data/qual-conditions.ts). SELF is the testing
   entry the Qualification Check runs as (data/qualifications.ts). Changes save with Save. */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { ToastService } from '../../../shared/toast.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';
import { ALL_QUALS } from '../../../data/qualifications';
import {
  QualCondition, SELF, conditionFields, conditionWhenText, heldBy, qualConditions, setQualConditions, userOf,
} from '../../../data/qual-conditions';
import { QualGroup, cloneGroup, pruneGroup, qualsIn, requirementText, termMet } from '../../../data/qual-requirements';
import { WhenGroup, cloneWhen, pruneWhen } from '../../../data/qual-when';
import { QualGroupEditorComponent } from './qual-group-editor.component';
import { WhenGroupEditorComponent } from './when-group-editor.component';

/* i = the condition's index in conditions(), so edits reach the right one while searched or sorted */
interface ConditionRow { i: number; c: QualCondition; userRow: boolean; when: string; require: string; }

const copy = (c: QualCondition): QualCondition => ({ when: cloneWhen(c.when), require: cloneGroup(c.require) });

@Component({
  selector: 'app-admin-qualifications',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent, QualGroupEditorComponent, WhenGroupEditorComponent, LucidePlus, LucideTrash2],
  templateUrl: './admin-qualifications.component.html'
})
export class AdminQualificationsComponent {
  private messages = inject(ToastService);
  self = SELF;
  allQuals = ALL_QUALS;
  conditions = signal<QualCondition[]>(qualConditions().map(copy));

  rows = computed(() => this.conditions().map((c, i): ConditionRow => {
    const userRow = userOf(c) !== null;
    return { i, c, userRow, when: conditionWhenText(c), require: (userRow ? 'Holds ' : '') + requirementText(c.require) };
  }));
  table = new TableState<ConditionRow>(['when', 'require']);

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
      { header: 'Require', value: (r: ConditionRow) => r.require },
    ], this.table.sorted());
  }

  /* added at the top, with the search cleared, so the new row is in view */
  addCondition() {
    const f = conditionFields()[0];
    const when: WhenGroup = { op: 'all', items: [{ field: f.key, value: f.options()[0]?.value ?? '' }] };
    this.conditions.update(cs => [{ when, require: { op: 'all', items: [] } }, ...cs]);
    this.table.clearFilters();
    this.table.sortField.set(null);
  }

  removeCondition(i: number) {
    this.conditions.update(cs => cs.filter((_, j) => j !== i));
  }

  /* a row that becomes a User row keeps only a plain list of its quals */
  setWhen(i: number, when: WhenGroup) {
    this.conditions.update(cs => cs.map((c, j) => {
      if (j !== i) return c;
      const next = { ...c, when };
      return userOf(next) !== null ? { ...next, require: { op: 'all', items: qualsIn(c.require) } } : next;
    }));
  }

  setRequire(i: number, require: QualGroup) {
    this.conditions.update(cs => cs.map((c, j) => j === i ? { ...c, require } : c));
  }

  save() {
    const cleaned = this.conditions().map(c => ({ when: pruneWhen(c.when), require: pruneGroup(c.require) }));
    this.conditions.set(cleaned);
    setQualConditions(cleaned.map(copy));
    this.messages.add({ severity: 'success', summary: 'Qualifications saved', detail: `${cleaned.length} conditions`, life: 3000 });
  }
}
