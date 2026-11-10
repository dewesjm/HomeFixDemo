/* Edits one AND/OR group of a field condition on Admin > Signoff Type Forms (condition-work.ts).
   Items are clauses or nested groups, which render this same editor. Edits are emitted as a new group. */
import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideX } from '@lucide/angular';
import { JOINT_AND_FABRICATION_FIELDS } from '../../catalogs/field-choices';
import { clauseChoiceId, clauseChoices, withSavedChoice } from './rules/condition-choices';
import { WorkClause, WorkGroup, WorkTerm, blankClause, isWorkGroup } from './rules/condition-work';
import { ChoiceSelectComponent } from './choice-select.component';

/* a field of the step a clause can test, with its suggested values */
export interface StepFieldChoice {
  key: string;
  label: string;
  values: { value: string; label: string }[];
  /* a checkbox: picked as Yes or No */
  yesNo?: boolean;
}

@Component({
  selector: 'app-condition-group-editor',
  standalone: true,
  imports: [FormsModule, LucidePlus, LucideX, ChoiceSelectComponent],
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

  private readonly choices = computed(() => clauseChoices(this.stepFields(), this.stepOnly()));
  readonly choiceId = clauseChoiceId;

  /* the clause list, with a saved clause it doesn't offer still showing */
  choicesFor(c: WorkClause) {
    return withSavedChoice(this.choices(), c);
  }

  /* picking from the list starts that clause over */
  pickClause(i: number, id: string) {
    const picked = this.choicesFor(this.asClause(this.group().items[i])).find(c => c.id === id);
    if (picked) this.setItem(i, picked.clause);
  }

  asGroup(t: WorkTerm): WorkGroup | null {
    return isWorkGroup(t) ? t : null;
  }

  asClause(t: WorkTerm): WorkClause {
    return isWorkGroup(t) ? blankClause() : t;
  }

  private jointField(key: string) {
    return JOINT_AND_FABRICATION_FIELDS.find(f => f.key === key);
  }

  /* a Joint Details or Fabrication field that is only ever Yes or No */
  jointYesNo(key: string): boolean {
    return this.jointField(key)?.values.join() === 'Yes,No';
  }

  fieldYesNo(key: string): boolean {
    return !!this.stepFields().find(f => f.key === key)?.yesNo;
  }

  /* suggested values for a Joint Details field (typed values stay allowed) */
  jointValues(key: string): string[] {
    return this.jointField(key)?.values ?? [];
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
