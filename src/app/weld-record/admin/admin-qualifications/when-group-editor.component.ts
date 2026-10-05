/* Edits one AND/OR group of a qual condition's When (data/qual-when.ts). Items are "field is value"
   clauses or nested groups, which render this same editor. User is offered only on the top group's
   single clause: picking it makes the row a User row, which has just that clause. Edits are emitted
   as a new group. */
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX } from '@lucide/angular';
import { ConditionField, ConditionOption, USER_FIELD, conditionField, conditionFields } from '../../../data/qual-conditions';
import { WhenClause, WhenGroup, WhenTerm, isWhenGroup } from '../../../data/qual-when';

const FIELD_GROUPS: ConditionField['group'][] = ['Joint Details', 'Sign-off', 'User'];

@Component({
  selector: 'app-when-group-editor',
  standalone: true,
  imports: [FormsModule, LucideX],
  templateUrl: './when-group-editor.component.html'
})
export class WhenGroupEditorComponent {
  group = input.required<WhenGroup>();
  nested = input(false);
  changed = output<WhenGroup>();
  removed = output<void>();

  private fieldGroups = FIELD_GROUPS.map(g => ({ name: g, fields: conditionFields().filter(f => f.group === g) }));

  /* the top group's only clause is User: the row is a User row */
  userRow(): boolean {
    const [t] = this.group().items;
    return !this.nested() && this.group().items.length === 1 && !isWhenGroup(t) && t.field === USER_FIELD;
  }

  fieldGroupsFor(): { name: string; fields: ConditionField[] }[] {
    const userOk = !this.nested() && this.group().items.length === 1;
    return this.fieldGroups.filter(g => g.name !== 'User' || userOk);
  }

  asGroup(t: WhenTerm): WhenGroup | null {
    return isWhenGroup(t) ? t : null;
  }

  asClause(t: WhenTerm): WhenClause {
    return isWhenGroup(t) ? { field: '', value: '' } : t;
  }

  options(field: string): ConditionOption[] {
    return conditionField(field)?.options() ?? [];
  }

  setOp(op: 'all' | 'any') {
    this.changed.emit({ ...this.group(), op });
  }

  /* a new clause starts as the first field's first value */
  addClause() {
    this.changed.emit({ ...this.group(), items: [...this.group().items, this.newClause(conditionFields()[0].key)] });
  }

  /* a new group starts as the opposite operator, since a group of the same kind adds nothing */
  addGroup() {
    const op = this.group().op === 'all' ? 'any' : 'all';
    this.changed.emit({ ...this.group(), items: [...this.group().items, { op, items: [this.newClause(conditionFields()[0].key)] }] });
  }

  /* picking a new field resets the value to that field's first option */
  setField(i: number, field: string) {
    this.setItem(i, this.newClause(field));
  }

  setValue(i: number, value: string) {
    this.setItem(i, { ...this.asClause(this.group().items[i]), value: value.trim() });
  }

  setItem(i: number, t: WhenTerm) {
    this.changed.emit({ ...this.group(), items: this.group().items.map((x, j) => j === i ? t : x) });
  }

  removeItem(i: number) {
    this.changed.emit({ ...this.group(), items: this.group().items.filter((_, j) => j !== i) });
  }

  private newClause(field: string): WhenClause {
    return { field, value: this.options(field)[0]?.value ?? '' };
  }
}
