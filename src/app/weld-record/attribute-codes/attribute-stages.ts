import { Job } from '../../data/jobs';
import { StageTemplate, WorkflowStage } from '../model/workflow-types';
import { getRoutingSignoffTypes } from '../signoff-definition/routing-signoff-types';
import { initialInspectionType, typeValues } from '../signoff-definition/stage-rules';
import { baseStepId } from '../routing/step-ids';
import { routingRole } from '../routing/routing-role';
import { activeAttributeCodes } from './attribute-context';
import { InspectionObligation, InspectionPhase, resolveAttributeInspections } from './inspection-requirements';

/* Retain the configured NDT routing as each obligation's owner, including its persona. */
export function applyAttributeStages(job: Job, stages: WorkflowStage[], templates: StageTemplate[]): WorkflowStage[] {
  if (!activeAttributeCodes(job).length) return stages;
  const baseline: InspectionObligation[] = stages.filter(s => /^(root|layer|final)-ndt-/.test(baseStepId(s.id)) && s.required)
    .map(s => ({ phase: baseStepId(s.id).split('-')[0] as InspectionPhase, templateId: s.id, sources: [],
      methods: (s.typeOptions ?? []).map(o => ({ type: o.value, ...(o.value === 'rt' ? { minRt: Number(baseStepId(s.id).startsWith('root-') ? job.rtRoot : job.rtFinal) || 0 } : {}) })) }));
  const resolved = resolveAttributeInspections(job, baseline);
  const result = [...stages];
  for (const phase of ['root', 'layer', 'final'] as const) {
    const original = result.filter(s => baseStepId(s.id).startsWith(`${phase}-ndt-`));
    let at = result.findIndex(s => original.includes(s));
    if (at < 0) {
      const anchor = phase === 'root' ? 'root-weld' : phase === 'layer' ? 'root-layer' : 'final-weld';
      at = result.findIndex(s => s.id === anchor) + 1;
    }
    const used = new Map<string, number>();
    const inspections = resolved.filter(o => o.phase === phase).sort((a, b) => {
      const order = (o: InspectionObligation) => o.templateId.endsWith('vt5x') ? 0 : o.templateId.endsWith('mtpt') ? 1 : 2;
      return order(a) - order(b);
    }).map(obligation => {
      const template = templates.find(t => t.id === obligation.templateId);
      const old = stages.find(s => s.id === obligation.templateId);
      const count = (used.get(obligation.templateId) ?? 0) + 1;
      used.set(obligation.templateId, count);
      const id = count === 1 ? obligation.templateId : `${obligation.templateId}--attribute-${count}`;
      const catalog = getRoutingSignoffTypes();
      const typeOptions = obligation.methods.flatMap(method => {
        const type = catalog.find(t => t.value === method.type);
        return type ? [{ value: type.value, label: `${type.label}${method.scope ? ' (ID)' : ''}${method.minRt ? ` (at least ${method.minRt}°)` : ''}${method.magnification ? ` (${method.magnification})` : ''}${method.access ? ` (ID accessible: ${method.access === 'yes' ? 'Yes' : 'No'})` : ''}` }] : [];
      });
      const names = typeOptions.map(o => o.label).join(' or ');
      return {
        ...(old ?? {}), id, label: `${phase[0].toUpperCase()}${phase.slice(1)} NDT ${names}`,
        required: true, role: template ? routingRole(template, job) : '',
        inputs: {}, signoffInputs: {}, result: null, signed: false, signedAt: null,
        rejectToStage: template?.rejectToStage ?? 'repair', decisionLabel: template?.decisionLabel ?? 'Inspection Results',
        typeOptions, ...typeValues(initialInspectionType({ typeOptions })), attributeInspection: obligation,
      } satisfies WorkflowStage;
    });
    for (const stage of original) result.splice(result.indexOf(stage), 1);
    result.splice(at, 0, ...inspections);
  }
  return result;
}

