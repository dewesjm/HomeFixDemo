/* Routing preview: run the real routing rules without saving and explain their outcome. */
import { Job } from '../../../data/jobs';
import { WorkflowStage } from '../../model/workflow-types';
import { DECISION_KEY } from '../../../data/signoff-type-forms';
import { buildConditionContext } from '../../signoff-forms/condition-context';
import { drawnFieldRule } from '../../signoff-forms/shown-fields';
import { isEngineeringHoldId } from '../../../data/welding-step-ids';
import { closesJoint } from '../current-routing';

export type SignoffPreview = (result?: WorkflowStage['result']) => { target: WorkflowStage | undefined; reasons: string[] };

/* The preview for `stage`, '' when there's nothing to say. A SAT/UNSAT step with no decision picked
   yet shows both outcomes. */
export function routePreviewLabel(job: Job, stages: WorkflowStage[], stage: WorkflowStage, activeId: string | null, preview: SignoffPreview, fab: Record<string, string> = {}): string {
  if (stage.signed || stage.id !== activeId || closesJoint(stage.id) || isEngineeringHoldId(stage.id)) return '';
  const from = stages.findIndex(s => s.id === stage.id);
  const phrase = (when: string, result?: WorkflowStage['result']) => {
    const { target, reasons } = preview(result);
    const why = `Why: ${reasons.length ? reasons.join('; ') : 'no special conditions'}.`;
    if (!target) return `${when}, the joint is complete. ${why}`;
    if (target.id === stage.id) return `${when}, the joint stays at ${stage.label}. ${why}`;
    if (target.label === stage.label) return `${when}, this routes to another ${stage.label}. ${why}`;
    const back = stages.findIndex(s => s.id === target.id);
    return `${when}, this routes ${back >= 0 && back < from ? 'back ' : ''}to ${target.label}. ${why}`;
  };
  if (drawnFieldRule(stage, buildConditionContext(stage, job, stages, fab), DECISION_KEY).shown && !stage.result) return `${phrase('On SAT', 'sat')} ${phrase('On UNSAT', 'unsat')}`;
  return phrase('On signoff');
}
