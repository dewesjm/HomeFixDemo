/* Admin > Signoff Types: a Type's "Additional routing to sign" rules (which other routing it signs, as
   which Type, and when). */
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdditionalSignoff, getSignoffTypes } from '../../../data/signoff-types';
import { FORM_FIELDS } from '../../catalogs/field-catalog';
import { formFieldValues } from '../../catalogs/field-choices';
import { ConditionGroupEditorComponent } from '../signoff-type-forms/condition-group-editor.component';
import { conditionToWork, workToCondition, WorkGroup } from '../signoff-type-forms/rules/condition-work';
import { FieldCondition } from '../../signoff-definition/field-conditions';

@Component({
  selector: 'app-additional-signoffs-editor', standalone: true,
  imports: [FormsModule, ConditionGroupEditorComponent],
  template: `
    @for (rule of rules(); track $index; let i = $index) {
      <div class="border border-base-300 rounded p-2 mb-2">
        <label>Additional routing to sign
          <select class="select select-sm select-bordered" [ngModel]="rule.stepId" (ngModelChange)="patch(i, { stepId: $event })">
            <option value="">Select routing…</option>
            @for (routing of routings(); track routing.id) { <option [value]="routing.id">{{ routing.label }}</option> }
          </select>
        </label>
        <label>As Type
          <select class="select select-sm select-bordered" [ngModel]="rule.type" (ngModelChange)="patch(i, { type: $event })">
            <option value="">Select Type…</option>
            @for (type of types; track type.value) { <option [value]="type.value">{{ type.label }}</option> }
          </select>
        </label>
        <div class="mt-2">When</div>
        <app-condition-group-editor [group]="toWork(rule.when)" [stepFields]="fields" (changed)="setWhen(i, $event)" />
        <button type="button" class="btn btn-ghost btn-xs" (click)="remove(i)">Remove rule</button>
      </div>
    }
    <button type="button" class="btn btn-outline btn-xs" (click)="add()">Add routing to sign</button>
  `,
})
export class AdditionalSignoffsEditorComponent {
  rules = input<AdditionalSignoff[]>([]);
  routings = input.required<{ id: string; label: string }[]>();
  changed = output<AdditionalSignoff[]>();
  types = getSignoffTypes();
  fields = FORM_FIELDS.filter(f => !f.ownComponent).map(f => ({ key: f.key, label: f.label, values: formFieldValues(f), yesNo: f.type === 'checkbox' }));
  /* Keep unfinished clauses in the editor; only complete clauses belong in saved rules. */
  private readonly drafts = new WeakMap<FieldCondition, WorkGroup>();
  toWork(condition: FieldCondition | undefined): WorkGroup {
    return (condition && this.drafts.get(condition)) || conditionToWork(condition);
  }
  patch(index: number, patch: Partial<AdditionalSignoff>) { this.changed.emit(this.rules().map((r, i) => i === index ? { ...r, ...patch } : r)); }
  setWhen(index: number, group: WorkGroup) {
    const when = workToCondition(group);
    this.drafts.set(when, group);
    this.patch(index, { when });
  }
  add() { this.changed.emit([...this.rules(), { stepId: '', type: '', when: { all: [] } }]); }
  remove(index: number) { this.changed.emit(this.rules().filter((_, i) => i !== index)); }
}
