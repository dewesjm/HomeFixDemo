/* Fit-Up Insp (and its NQC row): its fixed Type and Layer, the fitting values to verify against
   Fabrication, and Release to welding */
import { Component, input } from '@angular/core';
import { WorkflowStage } from '../../data/workflow';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-fitup-insp-form',
  standalone: true,
  host: { class: 'block' },
  templateUrl: './fitup-insp-form.component.html'
})
export class FitupInspFormComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();

  editable(): boolean {
    return this.ctx().inputsEditable(this.stage(), this.ctx().selectedRouting());
  }
}
