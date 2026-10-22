/* Fit-Up Insp (and its NQC row): its fixed Type and Inspecting, the fitting values to verify against
   Fabrication, any other fields its Signoff Type Definition lists, and Release to welding when it
   lists that */
import { Component, input } from '@angular/core';
import { StageField, WorkflowStage, definitionHas, isVerifyRow } from '../../data/workflow';
import { DefinitionFormComponent } from './definition-form.component';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-fitup-insp-form',
  standalone: true,
  imports: [DefinitionFormComponent],
  host: { class: 'block' },
  templateUrl: './fitup-insp-form.component.html'
})
export class FitupInspFormComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();

  isVerifyRow = isVerifyRow;

  gridRows(): StageField[] {
    return this.ctx().visibleFields(this.stage()).filter(f => isVerifyRow(f.key));
  }

  hasOtherFields(): boolean {
    return this.ctx().visibleFields(this.stage()).some(f => !isVerifyRow(f.key));
  }

  showsRelease(): boolean {
    return definitionHas(this.stage(), 'releaseToWelding');
  }

  editable(): boolean {
    return this.ctx().inputsEditable(this.stage(), this.ctx().selectedRouting());
  }
}
