/* Single entry point for the step's input form. While the Layout from Signoff Type Definition toggle
   is on, a step drawsFromDefinition() gets the definition-laid-out form; otherwise it dispatches to
   the layout sub-component for the step family determined by signoffForm(). Fields for built-in
   steps come from the field catalog config (via visibleFields → definedFields).

   Replacing the @switch in signoff-panel.component.html with this component keeps the panel
   template clean and makes the dispatch point easy to find. */
import { Component, input } from '@angular/core';
import { WorkflowStage } from '../model/workflow-types';
import { drawsFromDefinition, signoffForm } from '../signoff-definition/signoff-forms';
import { DefinitionFormComponent } from './definition-form.component';
import { FitupInspFormComponent } from './fitup-insp-form.component';
import { GenericStageFormComponent } from './generic-stage-form.component';
import { NdtStageFormComponent } from './ndt-stage-form.component';
import { RecordsReviewComponent } from './records-review.component';
import { WeldStageFormComponent } from './weld-stage-form.component';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-catalog-stage-form',
  standalone: true,
  imports: [DefinitionFormComponent, FitupInspFormComponent, GenericStageFormComponent, NdtStageFormComponent, RecordsReviewComponent, WeldStageFormComponent],
  host: { class: 'block' },
  template: `
    @let st = stage();
    @let f = form();
    @if (fromDefinition()) { <app-definition-form [ctx]="ctx()" [stage]="st" /> }
    @else if (f === 'fitup-insp') { <app-fitup-insp-form [ctx]="ctx()" [stage]="st" /> }
    @else if (f === 'records-review') { <app-records-review [ctx]="ctx()" [stage]="st" /> }
    @else if (f === 'weld') { <app-weld-stage-form [ctx]="ctx()" [stage]="st" /> }
    @else if (f === 'ndt') { <app-ndt-stage-form [ctx]="ctx()" [stage]="st" /> }
    @else if (f === 'generic') { <app-generic-stage-form [ctx]="ctx()" [stage]="st" /> }
  `
})
export class CatalogStageFormComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();

  form() { return signoffForm(this.stage()); }
  fromDefinition() { return drawsFromDefinition(this.stage()); }
}
