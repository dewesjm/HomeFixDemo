/* Admin > Qualifications: which quals the Test User holds (demo/testing aid), and the conditions
   that make a joint require a qual (data/qual-conditions.ts). Both drive Weld Record's
   Qualification Check (data/qualifications.ts). */
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../shared/toast.service';
import { procedures } from '../../../data/procedures';
import {
  ALL_QUALS, DEFAULT_TEST_USER_QUALS, TEST_USER_NAME, testUserQuals, setTestUserQuals
} from '../../../data/qualifications';
import { CONDITION_FIELDS, QualCondition, qualConditions, setQualConditions } from '../../../data/qual-conditions';

@Component({
  selector: 'app-admin-qualifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucidePlus, LucideTrash2],
  templateUrl: './admin-qualifications.component.html'
})
export class AdminQualificationsComponent {
  private messages = inject(ToastService);
  userName = TEST_USER_NAME;
  held = signal<ReadonlySet<string>>(new Set(testUserQuals()));
  conditions = signal<QualCondition[]>(qualConditions().map(c => ({ ...c })));
  conditionFields = CONDITION_FIELDS;
  allQuals = ALL_QUALS;

  /* each qual with how many WPS rows (one per GWP+WTN) require it, and the conditions that do */
  rows = computed(() => ALL_QUALS.map(q => ({
    qual: q,
    wtnCount: procedures().filter(p => p.qualificationsRequired.includes(q)).length,
    conditions: this.conditions().filter(c => c.qual === q).map(c => `${this.fieldLabel(c.field)} = ${c.value}`).join(', '),
  })));

  /* WPS rows the Test User would fail with the current (unsaved) selection */
  failingCount = computed(() => procedures().filter(p => p.qualificationsRequired.some(q => !this.held().has(q))).length);
  totalCount = computed(() => procedures().length);

  toggle(qual: string) {
    this.held.update(s => {
      const next = new Set(s);
      if (!next.delete(qual)) next.add(qual);
      return next;
    });
  }

  setAll(on: boolean) {
    this.held.set(new Set(on ? ALL_QUALS : []));
  }

  resetDefault() {
    this.held.set(new Set(DEFAULT_TEST_USER_QUALS));
  }

  fieldLabel(key: string): string {
    return CONDITION_FIELDS.find(f => f.key === key)?.label ?? key;
  }

  valuesFor(key: string): string[] {
    return CONDITION_FIELDS.find(f => f.key === key)?.values ?? [];
  }

  addCondition() {
    const f = CONDITION_FIELDS[0];
    this.conditions.update(cs => [...cs, { field: f.key, value: f.values[0], qual: ALL_QUALS[0] }]);
  }

  removeCondition(i: number) {
    this.conditions.update(cs => cs.filter((_, j) => j !== i));
  }

  /* picking a new field resets the value to that field's first one */
  setConditionField(i: number, field: string) {
    this.conditions.update(cs => cs.map((c, j) => j === i ? { ...c, field, value: this.valuesFor(field)[0] ?? '' } : c));
  }

  setCondition(i: number, patch: Partial<QualCondition>) {
    this.conditions.update(cs => cs.map((c, j) => j === i ? { ...c, ...patch } : c));
  }

  save() {
    setTestUserQuals([...this.held()]);
    setQualConditions(this.conditions().map(c => ({ ...c })));
    this.messages.add({ severity: 'success', summary: 'Qualifications saved', detail: `${this.held().size} of ${ALL_QUALS.length} held, ${this.conditions().length} conditions`, life: 3000 });
  }
}
