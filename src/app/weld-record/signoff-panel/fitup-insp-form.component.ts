/* Fit-Up Insp (and its NQC row): its fixed Type and Inspecting, the fitting values to verify against
   Fabrication, and Release to welding when its Signoff Type Definition lists it */
import { Component, input } from '@angular/core';
import { WorkflowStage, definitionHas } from '../../data/workflow';
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

  showsRelease(): boolean {
    return definitionHas(this.stage(), 'releaseToWelding');
  }

  editable(): boolean {
    return this.ctx().inputsEditable(this.stage(), this.ctx().selectedRouting());
  }
}
