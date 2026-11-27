/* Structural's Admin > Routing Settings starting rows: Pipe's rows for the steps Structural has
   (STRUCTURAL_STEP_IDS), with Pipe's rules before the NQC split, plus an ET routing per phase. No NQC
   rows, so N Ind doesn't pick a row and Repair's NQC destinations are left out. */
import { StageTemplate } from '../weld-record/model/stage-template';
import { ConditionRule } from '../weld-record/conditions-logic/joint-conditions';
import { RouteToRule } from '../weld-record/routing-logic/route-to-rules';
import { ADDED_STAGE_TEMPLATES, BUILT_IN_CONDITIONS, BUILT_IN_REJECT_RULES, BUILT_IN_STEPS, DEFAULT_THEN_RULES, NdtPhase } from './welding-steps';
import { STRUCTURAL_STEP_IDS } from './welding-step-ids';

/* one ET routing: like the other NDT routings, included when the phase's ET field is Yes */
function etStage(phase: NdtPhase): StageTemplate {
  return {
    id: `${phase}-ndt-et`,
    label: `${phase[0].toUpperCase()}${phase.slice(1)} NDT ET`,
    required: true,
    persona: 'Inspector',
    rejectToStage: 'repair',
    decisionLabel: 'Inspection Results',
  };
}

const ET_CONDITIONS: Record<string, ConditionRule[]> = {
  'root-ndt-et': [[{ field: 'etRoot', op: 'is', values: ['Yes'] }]],
  'final-ndt-et': [[{ field: 'etFinal', op: 'is', values: ['Yes'] }]],
};

const STEPS_BY_ID = new Map([...BUILT_IN_STEPS, etStage('root'), etStage('final')].map(s => [s.id, s]));

/* Repair without the destinations that name an NQC row, and without the N Ind half of its other rules */
const withoutNqc = (rules: RouteToRule[] = []): RouteToRule[] => rules
  .filter(r => !r.to.includes('nqc'))
  .map(r => ({ ...r, when: r.when.filter(c => c.field !== 'nInd') }));

/* Repair, Excavation NDT (the regular one only, for every joint) and Engineering Hold */
const STRUCTURAL_ADDED: StageTemplate[] = ADDED_STAGE_TEMPLATES
  .filter(t => t.id !== 'nqc-excavation-ndt')
  .map(t => t.id === 'repair' ? { ...t, thenRules: withoutNqc(t.thenRules) }
    : t.id === 'excavation-ndt' ? { ...t, includeWhen: undefined } : t);

export const STRUCTURAL_WELDING_STEPS: StageTemplate[] = STRUCTURAL_STEP_IDS.map((id): StageTemplate => {
  const step = STEPS_BY_ID.get(id)!;
  const includeWhen = BUILT_IN_CONDITIONS[id] ?? ET_CONDITIONS[id];
  return {
    ...step,
    ...(includeWhen ? { includeWhen } : {}),
    thenRules: DEFAULT_THEN_RULES[id] ?? [],
    ...(BUILT_IN_REJECT_RULES[id] ? { rejectRules: BUILT_IN_REJECT_RULES[id] } : {}),
  };
}).concat(STRUCTURAL_ADDED);
