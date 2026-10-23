/* One reading field on a step's sign-off (checkbox, radio, select or text/number), with its error.
   Used by the NDT and generic forms for every field they don't lay out specially. */
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StageField, WorkflowStage } from '../model/workflow-types';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-stage-field',
  standalone: true,
  imports: [FormsModule],
  host: { class: 'block w-full' },
  template: `
    @let st = stage();
    @let f = field();
    @if (f.type === 'checkbox') {
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" class="checkbox checkbox-sm" [class.checkbox-error]="!!ctx().fieldError(st.id, f.key)"
               [disabled]="!editable()"
               [checked]="st.inputs[f.key] === 'yes'"
               (change)="st.inputs[f.key] = $any($event.target).checked ? 'yes' : ''" />
        <span>{{ f.label }}@if (f.required) { <span class="text-error">*</span> }</span>
      </label>
    } @else if (f.type === 'radio') {
      <div>
        <div class="meta mb-1" [class.text-error]="!!ctx().fieldError(st.id, f.key)">{{ f.label }}@if (f.required) { <span class="text-error">*</span> }</div>
        <div class="flex gap-4">
          @for (o of f.options || []; track o.value) {
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" class="radio radio-sm" [class.radio-error]="!!ctx().fieldError(st.id, f.key)" [name]="'field-' + st.id + '-' + f.key"
                     [disabled]="!editable()"
                     [checked]="st.inputs[f.key] === o.value"
                     (change)="ctx().stageInputBlur(st, f, o.value)" />
              <span>{{ o.label }}</span>
            </label>
          }
        </div>
      </div>
    } @else {
      <label class="stage-field">
        <span class="stage-field-label">{{ f.label }}@if (f.required) { <span class="text-error">*</span> }{{ f.unit ? ' (' + f.unit + ')' : '' }}</span>
        @if (f.type === 'select') {
          <select class="select select-bordered" [class.select-error]="!!ctx().fieldError(st.id, f.key)" [disabled]="!editable()"
                  [ngModel]="st.inputs[f.key]" (ngModelChange)="ctx().stageSelectChange(st, f, $event)">
            @for (o of f.options || []; track o.value) { <option [ngValue]="o.value">{{ o.label }}</option> }
          </select>
        } @else {
          <input class="input input-bordered" [class.input-error]="!!ctx().fieldError(st.id, f.key)" [type]="f.type === 'number' ? 'number' : 'text'"
                 [placeholder]="f.placeholder || ''"
                 [disabled]="f.disabled || !editable()"
                 [ngModel]="st.inputs[f.key]"
                 (blur)="ctx().stageInputBlur(st, f, $any($event.target).value)" />
        }
      </label>
    }
    @if (ctx().fieldError(st.id, f.key); as err) {
      <div class="field-error">{{ err }}</div>
    }
  `
})
export class StageFieldComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
  field = input.required<StageField>();

  editable(): boolean {
    return this.ctx().inputsEditable(this.stage(), this.ctx().selectedRouting());
  }
}
