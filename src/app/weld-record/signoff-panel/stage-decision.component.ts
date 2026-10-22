/* A step's decision (Inspection Results: SAT/UNSAT), on a step with a reject target. The sign-off panel
   draws it below the step's form, or the definition form where the Layout list places it. */
import { Component, input } from '@angular/core';
import { WorkflowStage } from '../../data/workflow';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-stage-decision',
  standalone: true,
  host: { class: 'block' },
  template: `
    @let st = stage();
    <div class="meta" [class.text-error]="!!ctx().fieldError(st.id, '__decision')">{{ st.decisionLabel || 'Decision' }} <span class="text-error">*</span></div>
    <div class="result-radios">
      @for (o of ctx().resultOptions; track o.value) {
        <label>
          <input type="radio" class="radio radio-sm" [class.radio-error]="!!ctx().fieldError(st.id, '__decision')" [name]="'result-' + st.id" [disabled]="!ctx().editable(st)"
                 [checked]="st.result === o.value" (change)="ctx().setStageResult(st, o.value)" />
          <span>{{ o.label }}</span>
        </label>
      }
    </div>
    @if (ctx().fieldError(st.id, '__decision'); as err) {
      <div class="field-error">{{ err }}</div>
    }
  `
})
export class StageDecisionComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
}
