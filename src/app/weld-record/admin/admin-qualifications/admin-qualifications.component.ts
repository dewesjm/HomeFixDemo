/* Admin > Qualifications: the conditions that make a joint or WTN require quals
   (data/qual-conditions.ts), each an AND/OR group, with a toggle on every qual for whether the Test
   User holds it (demo/testing aid). Both drive Weld Record's Qualification Check
   (data/qualifications.ts). Toggles save right away; conditions save with Save. */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { ToastService } from '../../../shared/toast.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';
import {
  ALL_QUALS, DEFAULT_TEST_USER_QUALS, TEST_USER_NAME, testUserQuals, setTestUserQuals, toggleTestUserQual
} from '../../../data/qualifications';
import { CONDITION_FIELDS, QualCondition, conditionField, qualConditions, setQualConditions } from '../../../data/qual-conditions';
import { QualGroup, cloneGroup, pruneGroup, requirementText, termMet } from '../../../data/qual-requirements';
import { QualGroupEditorComponent } from './qual-group-editor.component';

/* i = the condition's index in conditions(), so edits reach the right one while searched or sorted */
interface ConditionRow { i: number; c: QualCondition; when: string; is: string; require: string; }

@Component({
  selector: 'app-admin-qualifications',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent, QualGroupEditorComponent, LucidePlus, LucideTrash2],
  templateUrl: './admin-qualifications.component.html'
})
export class AdminQualificationsComponent {
  private messages = inject(ToastService);
  userName = TEST_USER_NAME;
  held = testUserQuals;
  allQuals = ALL_QUALS;
  conditionFields = CONDITION_FIELDS;
  conditions = signal<QualCondition[]>(qualConditions().map(c => ({ ...c, require: cloneGroup(c.require) })));

  rows = computed(() => this.conditions().map((c, i): ConditionRow => ({
    i, c, when: this.fieldLabel(c.field), is: c.value, require: requirementText(c.require),
  })));
  table = new TableState<ConditionRow>(['when', 'is', 'require']);

  /* WTN conditions the Test User fails, as saved */
  wtnFails = computed(() => {
    const wtn = qualConditions().filter(c => c.field === 'wtn');
    return { failing: wtn.filter(c => !termMet(c.require, this.held())).length, total: wtn.length };
  });

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  exportCsv() {
    downloadCsv('qual-conditions', [
      { header: 'When', value: (r: ConditionRow) => r.when },
      { header: 'Is', value: (r: ConditionRow) => r.is },
      { header: 'Require', value: (r: ConditionRow) => r.require },
      { header: `${this.userName} meets`, value: (r: ConditionRow) => (termMet(r.c.require, this.held()) ? 'Yes' : 'No') },
    ], this.table.sorted());
  }

  toggleHeld(qual: string) {
    toggleTestUserQual(qual);
  }

  setAll(on: boolean) {
    setTestUserQuals(on ? [...ALL_QUALS] : []);
  }

  resetDefault() {
    setTestUserQuals([...DEFAULT_TEST_USER_QUALS]);
  }

  fieldLabel(key: string): string {
    return conditionField(key)?.label ?? key;
  }

  valuesFor(key: string): string[] {
    return conditionField(key)?.values() ?? [];
  }

  /* added at the top, with the search cleared, so the new row is in view */
  addCondition() {
    const f = CONDITION_FIELDS[0];
    this.conditions.update(cs => [{ field: f.key, value: f.values()[0], require: { op: 'all', items: [] } }, ...cs]);
    this.table.clearFilters();
    this.table.sortField.set(null);
  }

  removeCondition(i: number) {
    this.conditions.update(cs => cs.filter((_, j) => j !== i));
  }

  /* picking a new field resets the value to that field's first one */
  setConditionField(i: number, field: string) {
    this.conditions.update(cs => cs.map((c, j) => j === i ? { ...c, field, value: this.valuesFor(field)[0] ?? '' } : c));
  }

  setConditionValue(i: number, value: string) {
    this.conditions.update(cs => cs.map((c, j) => j === i ? { ...c, value } : c));
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
