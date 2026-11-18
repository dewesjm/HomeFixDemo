/* The Type droplist on a step's form: options from Admin > Signoff Type to Routing and Attribute Code
   Exceptions, narrowed by the "ID is accessible" answer and to the Types the viewer may sign; blank to
   start when none is the default (inspectionTypeRequired) or the default is not one the viewer signs */
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkflowStage } from '../model/workflow-types';
import { SignoffContext } from './signoff-context';
import { typesForAccessibleAnswer } from '../attribute-codes-logic/exception-effects';

@Component({
  selector: 'app-signoff-type',
  standalone: true,
  imports: [FormsModule],
  template: `
    @let st = stage();
    <label class="stage-field">
      <span class="stage-field-label">Type@if (ctx().inspectionTypeRequired(st)) { <span class="text-error">*</span> }</span>
      <select class="select select-bordered w-full" [class.select-error]="!!ctx().fieldError(st.id, '__inspectionType')"
              [disabled]="!canChoose()" [ngModel]="st.inspectionType" (ngModelChange)="ctx().setType(st, $event)">
        @if (ctx().inspectionTypeRequired(st)) {
          <option [ngValue]="''">Select the inspection performed…</option>
        } @else if (!hasCurrent()) {
          <option [ngValue]="st.inspectionType" disabled>Select a Type…</option>
        }
        @for (opt of options(); track opt.value) {
          <option [ngValue]="opt.value" [disabled]="!ctx().canChooseType(st, opt.value)">{{ opt.label }}</option>
        }
      </select>
    </label>
    @if (ctx().fieldError(st.id, '__inspectionType'); as err) {
      <div class="field-error">{{ err }}</div>
    }
  `
})
export class SignoffTypeComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
  canChoose = () => this.options().some(option => this.ctx().canChooseType(this.stage(), option.value));
  /* only the Types this viewer may sign on this routing; someone who can sign none still sees the
     routing's current Type (the droplist is then disabled) */
  options = () => {
    const all = typesForAccessibleAnswer(this.stage());
    const signable = all.filter(option => this.ctx().canSignType(this.stage(), option.value));
    return signable.length ? signable : all.filter(option => option.value === this.stage().inspectionType);
  };
  hasCurrent = () => this.options().some(option => option.value === this.stage().inspectionType);
}
