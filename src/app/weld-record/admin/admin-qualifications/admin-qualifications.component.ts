/* Admin > Qualifications: the conditions that make a step require quals, each an AND/OR group, and
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
  ConditionField, ConditionOption, QualCondition, SELF, USER_FIELD, conditionField, conditionFields, heldBy,
  qualConditions, setQualConditions,
} from '../../../data/qual-conditions';
import { QualGroup, cloneGroup, pruneGroup, qualsIn, requirementText, termMet } from '../../../data/qual-requirements';
import { QualGroupEditorComponent } from './qual-group-editor.component';

/* i = the condition's index in conditions(), so edits reach the right one while searched or sorted */
interface ConditionRow { i: number; c: QualCondition; when: string; is: string; require: string; }

const FIELD_GROUPS: ConditionField['group'][] = ['Joint Details', 'Sign-off', 'User'];

@Component({
  selector: 'app-admin-qualifications',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent, QualGroupEditorComponent, LucidePlus, LucideTrash2],
  templateUrl: './admin-qualifications.component.html'
})
export class AdminQualificationsComponent {
  private messages = inject(ToastService);
  self = SELF;
  userField = USER_FIELD;
  allQuals = ALL_QUALS;
  fieldGroups = FIELD_GROUPS.map(g => ({ name: g, fields: conditionFields().filter(f => f.group === g) }));
  conditions = signal<QualCondition[]>(qualConditions().map(c => ({ ...c, require: cloneGroup(c.require) })));

  rows = computed(() => this.conditions().map((c, i): ConditionRow => ({
    i, c, when: this.fieldLabel(c.field), is: this.valueLabel(c.field, c.value),
    require: (c.field === USER_FIELD ? 'Holds ' : '') + requirementText(c.require),
  })));
  table = new TableState<ConditionRow>(['when', 'is', 'require']);

  /* SELF's quals and the requirements they don't meet, as saved */
  selfHeld = computed(() => heldBy(SELF));
  requirementCount = computed(() => qualConditions().filter(c => c.field !== USER_FIELD).length);
  failingCount = computed(() => qualConditions().filter(c => c.field !== USER_FIELD && !termMet(c.require, this.selfHeld())).length);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  exportCsv() {
    downloadCsv('qual-conditions', [
      { header: 'When', value: (r: ConditionRow) => r.when },
      { header: 'Is', value: (r: ConditionRow) => r.is },
      { header: 'Require', value: (r: ConditionRow) => r.require },
    ], this.table.sorted());
  }

  fieldLabel(key: string): string {
    return conditionField(key)?.label ?? key;
  }

  options(key: string): ConditionOption[] {
    return conditionField(key)?.options() ?? [];
  }

  valueLabel(key: string, value: string): string {
    return this.options(key).find(o => o.value === value)?.label ?? value;
  }

  /* added at the top, with the search cleared, so the new row is in view */
  addCondition() {
    const f = conditionFields()[0];
    this.conditions.update(cs => [{ field: f.key, value: f.options()[0]?.value ?? '', require: { op: 'all', items: [] } }, ...cs]);
    this.table.clearFilters();
    this.table.sortField.set(null);
  }

  removeCondition(i: number) {
    this.conditions.update(cs => cs.filter((_, j) => j !== i));
  }

  /* picking a new field resets the value to that field's first option; a User row keeps only a
     plain list of its quals */
  setConditionField(i: number, field: string) {
    this.conditions.update(cs => cs.map((c, j) => {
      if (j !== i) return c;
      const require: QualGroup = field === USER_FIELD ? { op: 'all', items: qualsIn(c.require) } : c.require;
      return { ...c, field, value: this.options(field)[0]?.value ?? '', require };
    }));
  }

  setConditionValue(i: number, value: string) {
    this.conditions.update(cs => cs.map((c, j) => j === i ? { ...c, value: value.trim() } : c));
  }

  setRequire(i: number, require: QualGroup) {
    this.conditions.update(cs => cs.map((c, j) => j === i ? { ...c, require } : c));
  }

  save() {
    const cleaned = this.conditions().map(c => ({ ...c, require: pruneGroup(c.require) }));
    this.conditions.set(cleaned);
    setQualConditions(cleaned.map(c => ({ ...c, require: cloneGroup(c.require) })));
    this.messages.add({ severity: 'success', summary: 'Qualifications saved', detail: `${cleaned.length} conditions`, life: 3000 });
  }
}
