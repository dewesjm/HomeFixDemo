import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdditionalSignoff, getRoutingSignoffTypes } from '../../signoff-definition/routing-signoff-types';
import { FIELD_CATALOG } from '../../signoff-definition/field-catalog';
import { ConditionGroupEditorComponent } from '../admin-signoff-type-definition/condition-group-editor.component';
import { conditionToWork, workToCondition, WorkGroup } from '../admin-signoff-type-definition/condition-work';

@Component({
  selector: 'app-additional-signoffs-editor', standalone: true,
  imports: [FormsModule, ConditionGroupEditorComponent],
  template: `
    @for (rule of rules(); track $index; let i = $index) {
      <div class="border border-base-300 rounded p-2 mb-2">
        <label>Also signs routing
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
  types = getRoutingSignoffTypes();
  fields = FIELD_CATALOG.filter(f => !f.ownComponent).map(f => ({ key: f.key, label: f.label, values: f.options ?? [] }));
  toWork = conditionToWork;
  patch(index: number, patch: Partial<AdditionalSignoff>) { this.changed.emit(this.rules().map((r, i) => i === index ? { ...r, ...patch } : r)); }
  setWhen(index: number, group: WorkGroup) { this.patch(index, { when: workToCondition(group) }); }
  add() { this.changed.emit([...this.rules(), { stepId: '', type: '', when: { all: [] } }]); }
  remove(index: number) { this.changed.emit(this.rules().filter((_, i) => i !== index)); }
}
