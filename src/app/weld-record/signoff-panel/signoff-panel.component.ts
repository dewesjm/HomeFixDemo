import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideBadgeCheck, LucideCheck, LucideTriangleAlert, LucideX } from '@lucide/angular';
import { WorkflowStage, FOREMAN_OVERRIDE_ENABLED, hasDecision, isInspectionStage, isEngineeringHoldId, ndtLayerType } from '../../data/workflow';
import { requiresTraceability } from '../../data/mcl-traceability';
import { PersonSearchInputComponent } from '../../shared/person-search-input.component';
import { qualCheck, testUserQuals, QualCheckResult } from '../../data/qualifications';
import { conditionRequirements } from '../../data/qual-conditions';
import { AppDateTimePipe } from '../../shared/date-format';
import { EngineeringReleaseComponent } from '../engineering-release/engineering-release.component';
import { RecordsReviewComponent } from './records-review.component';
import { WeldStageFormComponent } from './weld-stage-form.component';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-signoff-panel',
  standalone: true,
  imports: [AppDateTimePipe, CommonModule, FormsModule, LucideBadgeCheck, LucideCheck, LucideTriangleAlert, LucideX, PersonSearchInputComponent, EngineeringReleaseComponent, RecordsReviewComponent, WeldStageFormComponent],
  templateUrl: './signoff-panel.component.html'
})
export class SignoffPanelComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
  stageIndex = input.required<number>();

  foremanOverrideEnabled = FOREMAN_OVERRIDE_ENABLED;

  /* inspection steps have no Qualification Check field; they check only the joint's condition quals */
  inspectionQualCheck(st: WorkflowStage): QualCheckResult | null {
    return isInspectionStage(st) ? qualCheck(testUserQuals(), conditionRequirements(this.ctx().job)) : null;
  }

  /* the two joint members a weld build-up can affect, with their MCL, MIC (fabricationData key)
     and MIC-verified keys */
  affectedItemSlots = [
    { key: 'joiningItem', mcl: 'mcl1', mic: 'id1', micLabel: 'MIC 1', micVerified: 'micVerified1' },
    { key: 'joinToItem', mcl: 'mcl2', mic: 'id2', micLabel: 'MIC 2', micVerified: 'micVerified2' },
  ] as const;

  isAffected(key: string): boolean {
    return (this.stage().inputs['affectedItems'] as string | undefined)?.includes(key) ?? false;
  }

  /* MIC 1/MIC 2 (fabricationData id1/id2) only show for a joint member whose MCL requires
     traceability per the admin MCL Traceability table (mcl-traceability.ts) */
  micRequired(mclValue: string): boolean {
    return requiresTraceability(mclValue);
  }

  micValue(mic: string): string {
    return this.ctx().wf().fabricationData[mic] ?? '';
  }

  readonly hasDecision = hasDecision;

  layerType(st: WorkflowStage): string {
    return ndtLayerType(st.id);
  }

  /* Engineering Hold has Engineering's release form (comments + set routing) instead of Signoff */
  isEngineeringHold(st: WorkflowStage): boolean {
    return isEngineeringHoldId(st.id);
  }

  /* Single source of truth for "is this the Fit stage routed as Weld Build-up" -- Weld Build-up
     gets its fields/layout from the weld-stage form (app-weld-stage-form, like Tack) instead of Fit's own signoff-field
     rendering below, so every fit-specific block in the template must use this same check rather
     than re-writing the id/routingType test inline (a mismatch duplicates Comments/Defer Tack). */
  isFitBuildup(st: WorkflowStage): boolean {
    return st.id === 'fit' && st.routingType === 'weld-buildup';
  }

  /* Fit stage's Consumable Insert MIC / Backing Ring MIC (joint-wide, not per-item like the
     Weld Build-up MIC verified checkboxes above) are only required when either joint member's
     MCL requires traceability */
  micSignoffRequired(): boolean {
    const job = this.ctx().job;
    return requiresTraceability(job.mcl1) || requiresTraceability(job.mcl2);
  }

  fieldsEditable(): boolean {
    return this.ctx().inputsEditable(this.stage(), this.ctx().selectedRouting());
  }
}
