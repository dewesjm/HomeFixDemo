/* One routing's sign-off on the joint page: the frame (Type, Inspecting, Comments, Signoff, overrides)
   around the routing's definition-form. */
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideBadgeCheck, LucideCheck, LucideTriangleAlert, LucideX } from '@lucide/angular';
import { WorkflowStage } from '../model/workflow-types';
import { FOREMAN_OVERRIDE_ENABLED } from '../signoff-forms-logic/weld-fields';
import { hasDecision } from '../signoff-forms-logic/stage-rules';
import { isEngineeringHoldId } from '../../data/welding-step-ids';
import { closesJoint } from '../routing-logic/current-routing';
import { inspectingLabel } from './rules/inspecting-label';
import { AppDateTimePipe } from '../../shared/date-format';
import { DefinitionFormComponent } from './definition-form.component';
import { EngineeringReleasePanelComponent } from '../engineering-release-panel/engineering-release-panel.component';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-signoff-panel',
  standalone: true,
  imports: [AppDateTimePipe, CommonModule, FormsModule, LucideBadgeCheck, LucideCheck, LucideTriangleAlert, LucideX,
    DefinitionFormComponent, EngineeringReleasePanelComponent],
  templateUrl: './signoff-panel.component.html'
})
export class SignoffPanelComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
  stageIndex = input.required<number>();

  foremanOverrideEnabled = FOREMAN_OVERRIDE_ENABLED;
  readonly hasDecision = hasDecision;
  readonly closesJoint = closesJoint;
  readonly isEngineeringHold = isEngineeringHoldId;
  readonly inspectingLabel = inspectingLabel;

  lacksSignoffPermission(st: WorkflowStage): boolean {
    const ctx = this.ctx();
    return !ctx.canSign(st) && (!!st.inspectionType ||
      (ctx.showRestrictedWorkflowActions() && !st.typeOptions?.some(option => ctx.canSignType(option.value))));
  }

  /* a step that records a WTN: the Foreman Override button (switched off) shows there */
  recordsWtn(st: WorkflowStage): boolean {
    return this.ctx().visibleFields(st).some(f => f.key === 'wtn');
  }
}
