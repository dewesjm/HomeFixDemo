/* An NDT step's Defect Code, drawn below the decision since it only applies once the result is UNSAT */
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkflowStage } from '../model/workflow-types';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-ndt-defect-code',
  standalone: true,
  imports: [FormsModule],
  host: { class: 'block' },
  template: `
    @let st = stage();
    @for (f of ctx().visibleFields(st); track f.key) {
      @if (f.key === 'defectCode') {
        <div class="mb-sm">
          <label class="stage-field" style="max-width: 320px">
            <span class="stage-field-label">{{ f.label }}@if (f.required) { <span class="text-error">*</span> }</span>
            <select class="select select-bordered w-full" [disabled]="!ctx().inputsEditable(st, ctx().selectedRouting())"
                    [ngModel]="st.inputs[f.key]" (ngModelChange)="ctx().stageSelectChange(st, f, $event)">
              <option [ngValue]="null">Select</option>
              @for (o of f.options || []; track o.value) { <option [ngValue]="o.value">{{ o.label }}</option> }
            </select>
          </label>
        </div>
      }
    }
  `
})
export class NdtDefectCodeComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
}
