import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideBadgeCheck, LucideCheck, LucideTriangleAlert, LucideX } from '@lucide/angular';
import { WorkflowStage } from '../model/workflow-types';
import { FOREMAN_OVERRIDE_ENABLED } from '../signoff-definition/weld-fields';
import {
  COMMENTS_FIELD,
  drawsFromDefinition,
  hasCommentsBox,
  panelDrawsQualCheck,
  signoffForm,
} from '../signoff-definition/signoff-forms';
import { hasDecision, showsType } from '../signoff-definition/stage-rules';
import { ndtLayerType } from '../routing/ndt';
import { qualCheck, QualCheckResult } from '../qualifications/qualifications';
import { conditionRequirements, heldQuals } from '../qualifications/qual-conditions';
import { AppDateTimePipe } from '../../shared/date-format';
import { CatalogStageFormComponent } from './catalog-stage-form.component';
import { EngineeringReleaseComponent } from '../engineering-release/engineering-release.component';
import { FitSignoffFormComponent } from './fit-signoff-form.component';
import { NdtDefectCodeComponent } from './ndt-defect-code.component';
import { SignoffContext } from './signoff-context';
import { StageDecisionComponent } from './stage-decision.component';

@Component({
  selector: 'app-signoff-panel',
  standalone: true,
  imports: [AppDateTimePipe, CommonModule, FormsModule, LucideBadgeCheck, LucideCheck, LucideTriangleAlert, LucideX,
    CatalogStageFormComponent, EngineeringReleaseComponent, FitSignoffFormComponent, NdtDefectCodeComponent, StageDecisionComponent],
  templateUrl: './signoff-panel.component.html'
})
export class SignoffPanelComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
  stageIndex = input.required<number>();

  foremanOverrideEnabled = FOREMAN_OVERRIDE_ENABLED;
  commentsField = COMMENTS_FIELD;
  readonly signoffForm = signoffForm;
  readonly drawsFromDefinition = drawsFromDefinition;
  readonly hasCommentsBox = hasCommentsBox;
  readonly hasDecision = hasDecision;
  readonly showsType = showsType;

  /* inspection steps have no Qualification Check field; they check the conditions the joint and step match */
  inspectionQualCheck(st: WorkflowStage): QualCheckResult | null {
    return panelDrawsQualCheck(st) ? qualCheck(heldQuals(), conditionRequirements(this.ctx().job, st)) : null;
  }

  layerType(st: WorkflowStage): string {
    return ndtLayerType(st.id);
  }
}
