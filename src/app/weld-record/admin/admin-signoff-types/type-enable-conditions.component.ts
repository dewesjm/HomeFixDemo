/* Joint Details conditions for one offered Type. Rules are OR; clauses within a rule are AND. */
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConditionRule, JOINT_DETAIL_FIELDS } from '../../routing/step-conditions';

@Component({
  selector: 'app-type-enable-conditions', standalone: true, imports: [FormsModule],
  template: `
    <div class="border rounded p-2 my-1 text-xs">
      <div class="font-semibold">Enable when</div>
      @if (!rules().length) { <p>Always enabled</p> }
      @for (rule of rules(); track $index; let ri = $index) {
        @if (ri > 0) { <div class="font-semibold my-1">OR</div> }
        @for (clause of rule; track $index; let ci = $index) {
          <div class="flex flex-wrap items-center gap-1 my-1">
            @if (ci > 0) { <span>AND</span> }
            <select class="select select-xs select-bordered" aria-label="Joint Details field"
              [ngModel]="clause.field" (ngModelChange)="setField(ri, ci, $event)">
              @for (field of fields; track field.key) { <option [value]="field.key">{{ field.label }}</option> }
            </select>
            <select class="select select-xs select-bordered" aria-label="Comparison"
              [ngModel]="clause.op" (ngModelChange)="clause.op = $event; emit()">
              <option value="is">is</option><option value="isNot">is not</option><option value="contains">contains</option>
            </select>
            <input class="input input-xs input-bordered" aria-label="Values separated by commas"
              placeholder="Values separated by commas" [attr.list]="listId() + '-' + ri + '-' + ci"
              [ngModel]="clause.values.join(', ')" (ngModelChange)="setValues(ri, ci, $event)" />
            <datalist [id]="listId() + '-' + ri + '-' + ci">
              @for (value of values(clause.field); track value) { <option [value]="value"></option> }
            </datalist>
            <button type="button" class="btn btn-ghost btn-xs" aria-label="Remove condition" (click)="remove(ri, ci)">Remove</button>
          </div>
        }
        <button type="button" class="btn btn-ghost btn-xs" (click)="addClause(ri)">Add AND condition</button>
      }
      <button type="button" class="btn btn-ghost btn-xs" (click)="addRule()">Add OR rule</button>
      <p class="opacity-70">Match any rule; all conditions in that rule must match. Commas separate alternative values. An empty value matches blank.</p>
    </div>
  `,
})
export class TypeEnableConditionsComponent {
  rules = input.required<ConditionRule[]>();
  listId = input.required<string>();
  changed = output<ConditionRule[]>();
  readonly fields = [...JOINT_DETAIL_FIELDS, { key: 'self.returningInspectionType', label: 'Returning inspection Type', values: ['vt', '5x', 'mt', 'pt', 'ut', 'rt'] }];
  values(field: string) { return this.fields.find(f => f.key === field)?.values ?? []; }
  emit() { this.changed.emit(structuredClone(this.rules())); }
  setField(ri: number, ci: number, field: string) {
    this.rules()[ri][ci] = { field, op: 'is', values: [''] }; this.emit();
  }
  setValues(ri: number, ci: number, value: string) {
    this.rules()[ri][ci].values = value.split(',').map(v => v.trim()); this.emit();
  }
  addClause(ri: number) { this.rules()[ri].push({ field: 'nInd', op: 'is', values: ['3'] }); this.emit(); }
  addRule() { this.changed.emit([...this.rules(), [{ field: 'nInd', op: 'is', values: ['3'] }]]); }
  remove(ri: number, ci: number) {
    const rules = structuredClone(this.rules()); rules[ri].splice(ci, 1);
    this.changed.emit(rules.filter(r => r.length));
  }
}
