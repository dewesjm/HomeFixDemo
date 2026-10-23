/* Edits one AND/OR group of a field condition on Admin > Signoff Type Definition (condition-work.ts).
   Items are clauses or nested groups, which render this same editor. Edits are emitted as a new group. */
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideX } from '@lucide/angular';
import { VIRTUAL_JOINT_DETAILS } from '../../signoff-definition/joint-facts';
import { JOINT_DETAIL_FIELDS } from '../../routing/step-conditions';
import { WorkClause, WorkGroup, WorkTerm, blankClause, isWorkGroup } from './condition-work';

/* a field of the step a clause can test, with its suggested values */
export interface StepFieldChoice {
  key: string;
  label: string;
  values: { value: string; label: string }[];
}

@Component({
  selector: 'app-condition-group-editor',
  standalone: true,
  imports: [FormsModule, LucidePlus, LucideX],
  templateUrl: './condition-group-editor.component.html',
})
export class ConditionGroupEditorComponent {
  group = input.required<WorkGroup>();
  nested = input(false);
  /* Prepopulated from's condition reads only the step itself */
  stepOnly = input(false);
  stepFields = input.required<StepFieldChoice[]>();
  changed = output<WorkGroup>();
  removed = output<void>();

  /* the Joint detail picker: yes/no joint facts, then the Joint Details fields */
  readonly jointFacts = Object.entries(VIRTUAL_JOINT_DETAILS).map(([key, f]) => ({ key, label: f.label }));
  readonly jointFields = JOINT_DETAIL_FIELDS.map(f => ({ key: f.key, label: f.label, values: f.values }));

  asGroup(t: WorkTerm): WorkGroup | null {
    return isWorkGroup(t) ? t : null;
  }

  asClause(t: WorkTerm): WorkClause {
    return isWorkGroup(t) ? blankClause() : t;
  }

  isJointFact(key: string): boolean {
    return key in VIRTUAL_JOINT_DETAILS;
  }

  /* suggested values for a Joint Details field (typed values stay allowed) */
  jointValues(key: string): string[] {
    return this.jointFields.find(f => f.key === key)?.values ?? [];
  }

  /* a saved key a picker doesn't list (typed before it existed) still shows */
  unlistedJointKey(key: string): boolean {
    return !!key && !this.isJointFact(key) && !this.jointFields.some(f => f.key === key);
  }

  unlistedFieldKey(key: string): boolean {
    return !!key && !this.stepFields().some(f => f.key === key);
  }

  /* suggested values for a step field (typed values stay allowed) */
  fieldValues(key: string): { value: string; label: string }[] {
    return this.stepFields().find(f => f.key === key)?.values ?? [];
  }

  /* each editor on the page needs its own datalist ids */
  private readonly listId = `cond-${Math.random().toString(36).slice(2, 8)}`;
  valuesListId(i: number): string {
    return `${this.listId}-${i}`;
  }

  setOp(op: 'all' | 'any') {
    this.changed.emit({ ...this.group(), op });
  }

  addClause() {
    this.changed.emit({ ...this.group(), items: [...this.group().items, blankClause()] });
  }

  /* a new group starts as the opposite operator, since a group of the same kind adds nothing */
  addGroup() {
    const op = this.group().op === 'all' ? 'any' : 'all';
    this.changed.emit({ ...this.group(), items: [...this.group().items, { op, items: [blankClause()] }] });
  }

  updateClause(i: number, partial: Partial<WorkClause>) {
    this.setItem(i, { ...this.asClause(this.group().items[i]), ...partial });
  }

  setItem(i: number, t: WorkTerm) {
    this.changed.emit({ ...this.group(), items: this.group().items.map((x, j) => j === i ? t : x) });
  }

  removeItem(i: number) {
    this.changed.emit({ ...this.group(), items: this.group().items.filter((_, j) => j !== i) });
  }
}
