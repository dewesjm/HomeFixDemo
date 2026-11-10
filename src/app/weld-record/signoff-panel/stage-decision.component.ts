/* A step's decision (Inspection Results: SAT/UNSAT), on a step with a reject target. The sign-off panel
   draws it below the step's form, or the definition form where the Layout list places it. */
import { Component, input } from '@angular/core';
import { WorkflowStage } from '../model/workflow-types';
import { buildConditionContext } from '../signoff-forms-logic/condition-context';
import { drawnFieldRule } from '../signoff-forms-logic/shown-fields';
import { DECISION_KEY } from '../../data/signoff-type-forms';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-stage-decision',
  standalone: true,
  host: { class: 'block' },
  template: `
    @let st = stage();
    @let r = rule();
    <div class="meta" [class.text-error]="!!ctx().fieldError(st.id, '__decision')">{{ st.decisionLabel || 'Decision' }}@if (r.required) { <span class="text-error">*</span>}</div>
    <div class="result-radios">
      @for (o of ctx().resultOptions; track o.value) {
        <label>
          <input type="radio" class="radio radio-sm" [class.radio-error]="!!ctx().fieldError(st.id, '__decision')" [name]="'result-' + st.id" [disabled]="!ctx().editable(st) || r.disabled"
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

  rule() {
    const wf = this.ctx().wf();
    return drawnFieldRule(this.stage(), buildConditionContext(this.stage(), this.ctx().job, wf.stages, wf.fabricationData), DECISION_KEY);
  }
}
