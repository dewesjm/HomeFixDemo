import { Injectable, inject } from '@angular/core';
import { isEngineeringHoldId } from '../../data/welding-step-ids';
import { ViewerService } from '../access-logic/viewer.service';
import { fabricationErrors } from '../fabrication-logic/fabrication-form';
import { detectDeviations } from '../deviation-logic/deviations';
import { conditionRequirements, heldQuals } from '../qualifications-logic/qual-conditions';
import { activeStage, closesJoint, currentRoutingLabel } from '../routing-logic/current-routing';
import { DeviationService } from '../services/deviation.service';
import { SignoffService } from '../services/signoff.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { visibleSignoffFields, withoutHiddenAnswers } from '../signoff-forms-logic/shown-fields';
import { snapshotInputs } from '../signoff-forms-logic/stage-display';
import { signProblems } from '../signoff-validation-logic/sign-validation';
import { visibleStageFields } from '../signoff-validation-logic/stage-form';
import { findJoint, type JointKey, type JointResult } from './joint-service';

const blocked = (error: string) => ({ ok: false as const, title: 'Signoff blocked', error });

@Injectable({ providedIn: 'root' })
export class JointSignoffService {
  private readonly viewer = inject(ViewerService);
  private readonly store = inject(WorkflowStore);
  private readonly signoff = inject(SignoffService);
  private readonly deviations = inject(DeviationService);

  signRouting(key: JointKey, routingId: string): JointResult<{ routing: string }> {
    const found = findJoint(key);
    if (!found.ok) return found;
    const job = found.data;
    const workflow = this.store.workflowFor(job);
    const wf = workflow();
    const stage = activeStage(wf.stages);
    if (!stage || stage.id !== routingId || closesJoint(stage.id) || isEngineeringHoldId(stage.id)) {
      return blocked('Choose the current signable routing. Fit-Up Release and Engineering Hold have separate workflows.');
    }
    if (stage.id === 'fitup-release') return blocked('Use releaseToWelding for Fit-Up Release.');
    if (!this.viewer.canSignRouting(stage.id, stage.signoffType)) {
      return { ok: false, title: 'Access denied', error: 'You do not have permission to sign this routing and type.' };
    }
    const open = this.deviations.openDeviations(wf);
    if (open.length && !open.some(d => d.stageId === stage.id)) return blocked('This joint is on Engineering Hold.');

    const fab = wf.fabricationData;
    const visibleFields = visibleStageFields(stage, { job, stages: wf.stages, fab, offListUnlocked: false });
    const problems = signProblems(stage, {
      job, fab, fabErrors: fabricationErrors(job, fab), visibleFields, stages: wf.stages, referenceCount: wf.references.length,
    });
    if (problems.length) return blocked(problems.map(p => p.message).join('\n'));
    const deviations = detectDeviations(stage, new Set(visibleFields.map(f => f.key)), heldQuals(), {
      type1: job.materialType1, type2: job.materialType2,
    }, conditionRequirements(job, stage, fab, wf.stages));
    if (deviations.length || stage.engineeringEntry) {
      return blocked('Use Joint Details to review deviations or engineering entries before signing.');
    }

    const clean = withoutHiddenAnswers(stage, job, wf.stages, fab);
    const inputs = snapshotInputs(clean, visibleFields, visibleSignoffFields(stage, job, fab));
    const preview = this.signoff.previewSignoff(wf, job, stage.id);
    if (preview.blocked) return blocked(preview.blocked);
    if (!this.signoff.signStage(job, stage.id, inputs)) return blocked('The signoff could not be completed.');
    return { ok: true, data: { routing: currentRoutingLabel(workflow().stages) } };
  }
}
