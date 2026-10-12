import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideBadgeCheck, LucideCheck, LucideTriangleAlert, LucideX } from '@lucide/angular';
import { WorkflowStage, FOREMAN_OVERRIDE_ENABLED, COMMENTS_FIELD, hasCommentsBox, hasDecision, isInspectionStage, ndtLayerType, signoffForm } from '../../data/workflow';
import { qualCheck, QualCheckResult } from '../../data/qualifications';
import { conditionRequirements, heldQuals } from '../../data/qual-conditions';
import { AppDateTimePipe } from '../../shared/date-format';
import { EngineeringReleaseComponent } from '../engineering-release/engineering-release.component';
import { FitSignoffFormComponent } from './fit-signoff-form.component';
import { FitupInspFormComponent } from './fitup-insp-form.component';
import { GenericStageFormComponent } from './generic-stage-form.component';
import { NdtDefectCodeComponent } from './ndt-defect-code.component';
import { NdtStageFormComponent } from './ndt-stage-form.component';
import { RecordsReviewComponent } from './records-review.component';
import { WeldStageFormComponent } from './weld-stage-form.component';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-signoff-panel',
  standalone: true,
  imports: [AppDateTimePipe, CommonModule, FormsModule, LucideBadgeCheck, LucideCheck, LucideTriangleAlert, LucideX,
    EngineeringReleaseComponent, FitSignoffFormComponent, FitupInspFormComponent, GenericStageFormComponent,
    NdtDefectCodeComponent, NdtStageFormComponent, RecordsReviewComponent, WeldStageFormComponent],
  templateUrl: './signoff-panel.component.html'
})
export class SignoffPanelComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
  stageIndex = input.required<number>();

  foremanOverrideEnabled = FOREMAN_OVERRIDE_ENABLED;
  commentsField = COMMENTS_FIELD;
  readonly signoffForm = signoffForm;
  readonly hasCommentsBox = hasCommentsBox;
  readonly hasDecision = hasDecision;

  /* inspection steps have no Qualification Check field; they check the conditions the joint and step match */
  inspectionQualCheck(st: WorkflowStage): QualCheckResult | null {
    return isInspectionStage(st) ? qualCheck(heldQuals(), conditionRequirements(this.ctx().job, st)) : null;
  }

  layerType(st: WorkflowStage): string {
    return ndtLayerType(st.id);
  }
}
