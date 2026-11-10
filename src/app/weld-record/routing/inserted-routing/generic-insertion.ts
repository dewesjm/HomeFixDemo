/* One resolver builds ordinary inserted work for execution, seeds and preview. */
import { RoutingConfigurationError } from '../routing-configuration-error';
import { getStepFieldConfig } from '../../../data/signoff-type-forms';
import { Job } from '../../../data/jobs';
import { WorkflowStage } from '../../model/workflow-types';
import { StageTemplate } from '../../model/stage-template';
import { signoffTypeOptions } from '../../signoff-definition/signoff-type-routing-rules';
import { addedRoutingSetup } from './added-routing-configuration';
import { stageFromTemplate } from './added-routings';
import { conditionsMatch } from '../../conditions/joint-conditions';
import { routingRole } from '../routing-persona';
import { insertionDefinitionId, insertedDefinitionId } from './instance-identity';
import { isRepairStageId, isExcavationNdtStageId, repairIdForExcavation, baseStepId } from '../routing-ids';

export function resolveInsertion(templates: StageTemplate[], stages: WorkflowStage[], job: Job,
  source: WorkflowStage, target: string, recordedIds: string[] = [], fab?: Record<string, string>): WorkflowStage {
  const id = insertionDefinitionId(target);
  const definition = templates.find(t => t.id === id);
  const fail = (why: string): never => { throw new RoutingConfigurationError(`Cannot insert ${definition?.label ?? id}: ${why}.`); };
  if (!definition || definition.classification !== 'added' || definition.lifecycle !== 'ordinary') return fail('definition is missing or unsupported');
  if (definition.status !== 'active') return fail('definition is not active');
  const setup = addedRoutingSetup(definition);
  if (setup.errors.length) return fail(setup.errors.join(' '));
  if (!conditionsMatch(definition.includeWhen, job, stages, source, fab)) return fail('applicability conditions do not match');
  const role = routingRole(definition, job);
  if (!role || role === 'View') return fail('no signing persona is available');
  const sequence = Math.max(0, ...[...stages.map(s => s.id), ...recordedIds].filter(key => insertedDefinitionId(key) === id).map(key => Number(key.split(':').at(-1)))) + 1;
  const at = stages.findIndex(s => s.id === source.id);
  const parent = isRepairStageId(source.id) ? source.id : isExcavationNdtStageId(source.id) ? repairIdForExcavation(source.id) : source.insertion?.parentRepairId;
  const repair = stages.find(s => s.id === parent);
  const origin = source.insertion ?? repair?.inputs ?? source.inputs;
  const insertion: NonNullable<WorkflowStage['insertion']> = {
    definition: structuredClone(definition), sequence, sourceId: source.id,
    continueAt: source.insertion?.continueAt ?? stages.slice(at + 1).find(s => s.required && !s.signed)?.id ?? '',
    originStageId: origin['originStageId'] || source.id,
    originPhase: origin['originPhase'] || (/^(root|layer|final)-ndt-/.exec(baseStepId(source.id))?.[1]),
    originInspectionType: origin['originInspectionType'] || source.inspectionType,
    parentRepairId: parent,
  };
  const typeOptions = signoffTypeOptions(id, job, {}, insertion.originPhase ? insertion.originInspectionType : undefined);
  if (!typeOptions?.length) return fail('no Signoff Type is enabled or rejecting inspection context is missing');
  const forms = getStepFieldConfig();
  if (typeOptions.some(o => (o.signsStep && o.signsStep !== id) ||
    !forms.some(f => f.typeId === o.value && f.fields.some(field => field.heading === undefined)))) return fail('resolved Type must sign this routing and have a form');
  const label = `${definition.displayName || definition.label} ${sequence}`;
  return { ...stageFromTemplate({ ...definition, id: `added:${id}:${sequence}`, label, typeOptions, role }), insertion };
}
