import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideBadgeCheck, LucideCheck, LucideTriangleAlert, LucideX } from '@lucide/angular';
import { WorkflowStage } from '../model/workflow-types';
import { FOREMAN_OVERRIDE_ENABLED } from '../signoff-definition/weld-fields';
import { hasDecision } from '../signoff-definition/stage-rules';
import { isEngineeringHoldId } from '../routing/step-ids';
import { closesJoint, inspectingLabel } from '../routing/built-in-step-rules';
import { AppDateTimePipe } from '../../shared/date-format';
import { DefinitionFormComponent } from './definition-form.component';
import { EngineeringReleaseComponent } from '../engineering-release/engineering-release.component';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-signoff-panel',
  standalone: true,
  imports: [AppDateTimePipe, CommonModule, FormsModule, LucideBadgeCheck, LucideCheck, LucideTriangleAlert, LucideX,
    DefinitionFormComponent, EngineeringReleaseComponent],
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

  /* a step that records a WTN: the Foreman Override button (switched off) shows there */
  recordsWtn(st: WorkflowStage): boolean {
    return this.ctx().visibleFields(st).some(f => f.key === 'wtn');
  }
}
