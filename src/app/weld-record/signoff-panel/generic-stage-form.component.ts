/* The form for a step with no layout of its own (Repair, Fit-Up Release, steps added in
   Admin > Routing Settings): its visible fields in order, a new line where a group starts */
import { Component, input } from '@angular/core';
import { WorkflowStage } from '../../data/workflow';
import { SignoffContext } from './signoff-context';
import { StageFieldComponent } from './stage-field.component';

@Component({
  selector: 'app-generic-stage-form',
  standalone: true,
  imports: [StageFieldComponent],
  host: { class: 'block' },
  template: `
    @let st = stage();
    @if (ctx().visibleFields(st).length) {
      <div class="stage-inputs">
        @for (f of ctx().visibleFields(st); track f.key) {
          @if (ctx().startsGroup(st, f) || f.showIf?.key === 'inspectionType') { <span class="stage-field-break"></span> }
          <app-stage-field [ctx]="ctx()" [stage]="st" [field]="f" />
        }
      </div>
    }
  `
})
export class GenericStageFormComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
}
