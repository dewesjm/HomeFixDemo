/* Edits one AND/OR group of a qual condition's When (weld-record/qualifications-logic/qual-when.ts). Items are clauses
   (is, is not or contains, as in Routing Settings) or nested groups, which render this same editor.
   User is offered only on the top group's single clause: picking it makes the row a User row, which has
   just that clause. Edits are emitted as a new group. */
import { Component, input, output } from '@angular/core';
import { fieldChoiceLabel } from '../../catalogs/field-choices';
import { FormsModule } from '@angular/forms';
import { LucideX } from '@lucide/angular';
import { USER_FIELD } from '../../../data/qualifications';
import { ConditionField, ConditionOption, conditionField, conditionFields } from '../../qualifications-logic/qual-conditions';
import { WhenClause, WhenGroup, WhenTerm, isWhenGroup, newWhenClause } from '../../qualifications-logic/qual-when';

const FIELD_GROUPS: ConditionField['group'][] = ['Joint Details', 'Calculated', 'Fabrication', 'Routing answers', 'Sign-off', 'User'];

@Component({
  selector: 'app-when-group-editor',
  standalone: true,
  imports: [FormsModule, LucideX],
  templateUrl: './when-group-editor.component.html'
})
export class WhenGroupEditorComponent {
  readonly choiceLabel = fieldChoiceLabel;
  group = input.required<WhenGroup>();
  nested = input(false);
  changed = output<WhenGroup>();
  removed = output<void>();

  readonly userField = USER_FIELD;
  private fieldGroups = FIELD_GROUPS.map(g => ({ name: g, fields: conditionFields().filter(f => f.group === g) }));

  /* the top group's only clause is User: the row is a User row */
  userRow(): boolean {
    const [t] = this.group().items;
    return !this.nested() && this.group().items.length === 1 && !isWhenGroup(t) && t.field === USER_FIELD;
  }

  /* Type has its own Signoff Type column, and fields off the Qualification Check forms can't match;
     a clause saved with one still shows it */
  fieldGroupsFor(current: string): { name: string; fields: ConditionField[] }[] {
    const userOk = !this.nested() && this.group().items.length === 1;
    return this.fieldGroups
      .filter(g => g.name !== 'User' || userOk)
      .map(g => ({ ...g, fields: g.fields.filter(f => (!f.ownColumn && !f.unavailable) || f.key === current) }));
  }

  asGroup(t: WhenTerm): WhenGroup | null {
    return isWhenGroup(t) ? t : null;
  }

  asClause(t: WhenTerm): WhenClause {
    return isWhenGroup(t) ? { field: '', op: 'is', values: [] } : t;
  }

  options(field: string): ConditionOption[] {
    return conditionField(field)?.options() ?? [];
  }

  /* contains, or a field with no value list, takes typed text */
  typed(c: WhenClause): boolean {
    return c.op === 'contains' || !this.options(c.field).length;
  }

  setOp(op: 'all' | 'any') {
    this.changed.emit({ ...this.group(), op });
  }

  addClause() {
    this.changed.emit({ ...this.group(), items: [...this.group().items, newWhenClause(conditionFields()[0].key)] });
  }

  /* a new group starts as the opposite operator, since a group of the same kind adds nothing */
  addGroup() {
    const op = this.group().op === 'all' ? 'any' : 'all';
    this.changed.emit({ ...this.group(), items: [...this.group().items, { op, items: [newWhenClause(conditionFields()[0].key)] }] });
  }

  /* picking User starts on its first person, the only field with one value and no comparison */
  setField(i: number, field: string) {
    this.setItem(i, field === USER_FIELD ? { ...newWhenClause(field), values: [this.options(field)[0]?.value ?? ''] } : newWhenClause(field));
  }

  /* switching between picked values and typed text starts with no values */
  setComparison(i: number, op: WhenClause['op']) {
    const c = this.asClause(this.group().items[i]);
    const next = { ...c, op };
    this.setItem(i, this.typed(next) !== this.typed(c) ? { ...next, values: [] } : next);
  }

  setUser(i: number, user: string) {
    this.setItem(i, { ...this.asClause(this.group().items[i]), values: [user] });
  }

  setText(i: number, text: string) {
    const value = text.trim();
    this.setItem(i, { ...this.asClause(this.group().items[i]), values: value ? [value] : [] });
  }

  toggleValue(i: number, value: string) {
    const c = this.asClause(this.group().items[i]);
    this.setItem(i, { ...c, values: c.values.includes(value) ? c.values.filter(v => v !== value) : [...c.values, value] });
  }

  setItem(i: number, t: WhenTerm) {
    this.changed.emit({ ...this.group(), items: this.group().items.map((x, j) => j === i ? t : x) });
  }

  removeItem(i: number) {
    this.changed.emit({ ...this.group(), items: this.group().items.filter((_, j) => j !== i) });
  }
}
