/* Admin > Routing Settings starting rows: the built-in Welding routing in order, its starting Included when,
   Reject routes to and Then go to rules, and the added routings (Repair, Excavation NDT, Engineering Hold).
   Saved changes are in routing-settings.ts. Type options are in signoff-type-routing.ts. */
import { StageTemplate } from '../weld-record/model/workflow-types';
import { ndtStage } from '../weld-record/routing/ndt';
import { NQC_SPLIT_STEP_IDS, PHASE_NDT_KINDS, nqcStepId } from '../weld-record/routing/routing-ids';
import { ConditionClause, ConditionRule } from '../weld-record/conditions/joint-conditions';
import { RouteToRule } from '../weld-record/routing/route-to-rules';
import { ENGINEERING_HOLD_TARGET } from '../weld-record/routing/on-signoff/rule-targets';

const BUILT_IN_STEPS: StageTemplate[] = [
  { id: 'pre-fit', label: 'Pre-Fit', description: 'Pre-Fit is a required step where NQC validates the consumable insert or backing ring being utilized prior to fitting. Only applies on Nuclear Joints, where a consumable insert or backing ring is required', required: true, role: 'NQC Inspector' },
  { id: 'fit', label: 'Fit', required: true, role: 'Fitting' },
  { id: 'tack', label: 'Tack', displayName: 'Tack', required: true, role: 'Welding' },
  { id: 'fitup-insp', label: 'Fit-Up Insp', required: true, role: 'Foreman|Inspector', decisionLabel: 'Inspection Results', rejectToStage: 'fit' },
  { id: 'fitup-release', label: 'Fit-Up Release', displayName: 'Fit-Up Release', required: false, role: 'Foreman' },
  { id: 'deferred-tack', label: 'Deferred Tack', displayName: 'Tack', required: false, role: 'Welding' },
  { id: 'root-weld', label: 'Root', required: true, role: 'Welding' },
  ...PHASE_NDT_KINDS.root.map(kind => ndtStage('root', kind)),
  { id: 'root-layer', label: 'Layer', required: true, role: 'Welding' },
  ...PHASE_NDT_KINDS.layer.map(kind => ndtStage('layer', kind)),
  { id: 'final-weld', label: 'Final Weld', required: true, role: 'Welding' },
  ...PHASE_NDT_KINDS.final.map(kind => ndtStage('final', kind)),
  { id: 'review-o63', label: 'O63 Records Review', required: true, role: 'O63 Records', rejectToStage: 'review-o63', decisionLabel: 'Inspection Results' },
  { id: 'review-o04', label: 'O04 Records Review', required: true, role: 'O04 Records', rejectToStage: 'review-o04', decisionLabel: 'Inspection Results' },
  { id: 'sold', label: 'Sold', required: true, role: 'O63 Records' },
];

/* each NQC_SPLIT_STEP_IDS step is followed by its NQC row: same step, signed by NQC Inspector, shown
   under the same Display Name (its Included when, below, splits them by N Ind) */
export const WELDING_STEPS: StageTemplate[] = BUILT_IN_STEPS.flatMap(t => NQC_SPLIT_STEP_IDS.includes(t.id)
  ? [t, { ...t, id: nqcStepId(t.id), label: `NQC ${t.label}`, displayName: t.displayName ?? t.label, role: 'NQC Inspector' }]
  : [t]);

/* ── Starting Included when / Reject routes to / Then go to rules ── */

const RT_TAKEN = ['10', '100', '360', '60', '75'];
const utrtRule = (ndtKey: string, rtKey: string): ConditionRule[] => [
  [{ field: ndtKey, op: 'is', values: ['UT'] }],
  [{ field: rtKey, op: 'is', values: RT_TAKEN }],
];
const mtptRule = (ndtKey: string): ConditionRule[] => [[{ field: ndtKey, op: 'is', values: ['MT', 'PT', 'MT/PT'] }]];

/* the rules the app was built with, before the NQC split below */
const BUILT_IN_CONDITIONS: Record<string, ConditionRule[]> = {
  'pre-fit': [
    [{ field: 'nInd', op: 'is', values: ['1', '2'] }],
    [{ field: 'jdInsert', op: 'is', values: ['Yes'] }],
    [{ field: 'jdRing', op: 'is', values: ['Yes'] }],
  ],
  'tack': [[{ field: 'fitDeferTack', op: 'isNot', values: ['Yes'] }]],
  'fitup-release': [[{ field: 'inspReleaseToWelding', op: 'is', values: ['No'] }]],
  'deferred-tack': [[{ field: 'fitDeferTack', op: 'is', values: ['Yes'] }]],
  'root-ndt-mtpt': mtptRule('ndtRoot'),
  'root-ndt-utrt': utrtRule('ndtRoot', 'rtRoot'),
  /* Layer NDT comes up only when NDT Each is set */
  'layer-ndt-vt5x': [[{ field: 'ndtEach', op: 'is', values: ['VT', '5X'] }]],
  'layer-ndt-mtpt': mtptRule('ndtEach'),
  'final-ndt-mtpt': mtptRule('ndtFinal'),
  'final-ndt-utrt': utrtRule('ndtFinal', 'rtFinal'),
  'review-o63': [
    [{ field: 'sfff', op: 'is', values: ['Yes'] }],
    [{ field: 'dssAaa', op: 'is', values: ['Yes'] }],
    [{ field: 'ss', op: 'is', values: ['Yes'] }],
  ],
  'review-o04': [[
    { field: 'sfff', op: 'is', values: ['No'] },
    { field: 'dssAaa', op: 'is', values: ['No'] },
    { field: 'ss', op: 'is', values: ['No'] },
  ]],
};

/* every rule of `rules` (or the one rule, when it has none) gets an "N Ind. is <values>" clause added */
const withNInd = (rules: ConditionRule[] | undefined, values: string[]): ConditionRule[] => {
  const clause: ConditionClause = { field: 'nInd', op: 'is', values };
  return rules?.length ? rules.map(r => [...r, clause]) : [[clause]];
};

/* the rules the app was built with; Admin > Routing Settings can change any of them. An NQC row
   (routing-ids.ts) is included when N Ind is 1 or 2, its regular row when N Ind is 3, each on top of the
   step's own rules */
export const DEFAULT_STEP_CONDITIONS: Record<string, ConditionRule[]> = {
  ...BUILT_IN_CONDITIONS,
  ...Object.fromEntries(NQC_SPLIT_STEP_IDS.flatMap(id => [
    [id, withNInd(BUILT_IN_CONDITIONS[id], ['3'])],
    [nqcStepId(id), withNInd(BUILT_IN_CONDITIONS[id], ['1', '2'])],
  ])),
};


/* built-in reject rules (Admin > Routing Settings can change them): a PT failure on a GTAW weld goes to
   Engineering Hold instead of Repair; the weld that counts is that phase's own weld step */
const gtawPtHold = (weldStepId: string): RouteToRule[] => [{
  when: [
    { field: 'self.inspectionType', op: 'is', values: ['pt'] },
    { field: `step.${weldStepId}.weldProcess`, op: 'is', values: ['gtaw'] },
  ],
  to: ENGINEERING_HOLD_TARGET,
}];
const BUILT_IN_REJECT_RULES: Record<string, RouteToRule[]> = {
  'root-ndt-mtpt': gtawPtHold('root-weld'),
  'layer-ndt-mtpt': gtawPtHold('root-layer'),
  'final-ndt-mtpt': gtawPtHold('final-weld'),
};
/* an NQC row starts with its regular row's reject rules */
export const DEFAULT_REJECT_RULES: Record<string, RouteToRule[]> = {
  ...BUILT_IN_REJECT_RULES,
  ...Object.fromEntries(Object.entries(BUILT_IN_REJECT_RULES).map(([id, rules]) => [nqcStepId(id), rules])),
};

/* Starting accepted-signoff rules, editable in Routing Settings. Attribute code IA can add Layer MT/PT
   (Admin > Attribute Code Exceptions), so Layer and Layer VT/5X go back to Layer only without IA and
   Layer MT/PT does it after them. */
const NOT_IA: ConditionClause = { field: 'attributeCodes', op: 'isNot', values: ['IA'] };
export const DEFAULT_THEN_RULES: Record<string, RouteToRule[]> = {
  fit: [{ when: [{ field: 'self.inspectionType', op: 'is', values: ['weld-buildup'] }], to: 'fit' }],
  'root-layer': [{ when: [
    { field: 'self.inspectionType', op: 'is', values: ['interim'] },
    { field: 'ndtEach', op: 'is', values: [''] },
    NOT_IA,
  ], to: 'root-layer' }],
  ...Object.fromEntries(PHASE_NDT_KINDS.layer.flatMap(kind => {
    const id = `layer-ndt-${kind}`;
    const rules: RouteToRule[] = [{ when: [
      { field: 'step.root-layer.inspectionType', op: 'is', values: ['interim'] },
      ...(kind === 'vt5x' ? [NOT_IA] : []),
    ], to: 'root-layer' }];
    return [[id, rules], [nqcStepId(id), rules]];
  })),
};

/* ── Added routings: inserted while a joint is worked ── */

const REPAIR_STAGE: StageTemplate = {
  classification: 'added', lifecycle: 'repair', status: 'active', id: 'repair', label: 'Repair', required: true, role: 'Foreman',
  description: 'Repair is inserted whenever an NDT is recorded as UNSAT. Repair codes are configurable and are utilized to route the joint further',
  decisionLabel: 'Inspection Results',
};

const ENGINEERING_HOLD_STAGE: StageTemplate = {
  classification: 'added', lifecycle: 'engineering-hold', status: 'active', id: 'engineering-hold', label: 'Engineering Hold', required: true, role: 'Engineering',
};

export const ADDED_STAGE_TEMPLATES: StageTemplate[] = [
  { ...REPAIR_STAGE, thenRules: [
    { when: [{ field: 'self.allowableThicknessExceededN1', op: 'is', values: ['yes'] }], to: 'rejecting-utrt' },
    { when: [{ field: 'self.allowableThicknessExceededN23', op: 'is', values: ['yes'] }], to: 'rejecting-utrt' },
    { when: [{ field: 'self.repairType', op: 'is', values: ['grind'] }], to: 'rejecting-ndt' },
    { when: [{ field: 'self.repairType', op: 'is', values: ['cut'] }], to: 'fit' },
    { when: [{ field: 'self.repairType', op: 'is', values: ['weld-repair'] }], to: 'add-excavation-ndt' },
  ] },
  { classification: 'added', lifecycle: 'excavation', status: 'active', id: 'excavation-ndt', label: 'Excavation NDT', required: true, role: 'Inspector',
    description: 'Excavation NDT is a request to repair, validating that the joint has been prepared and is ready for the actual repair (weld repair, cut, etc.) to proceed. Requires NQC for nuclear joints',
    includeWhen: [[{ field: 'nInd', op: 'is', values: ['3'] }]],
    rejectToStage: 'own-repair', thenRules: [
      { when: [{ field: 'self.originalInspectionType', op: 'is', values: ['pt'] }, { field: 'self.performedInspectionType', op: 'is', values: ['5x'] }], to: 'rejecting-vt5x' },
      { when: [], to: 'rejecting-ndt' },
    ] },
  { classification: 'added', lifecycle: 'excavation', status: 'active', id: 'nqc-excavation-ndt', label: 'NQC Excavation NDT', displayName: 'Excavation NDT', required: true, role: 'NQC Inspector',
    description: 'Excavation NDT is a request to repair, validating that the joint has been prepared and is ready for the actual repair (weld repair, cut, etc.) to proceed. Requires NQC for nuclear joints',
    includeWhen: [[{ field: 'nInd', op: 'is', values: ['1', '2'] }]],
    rejectToStage: 'own-repair', thenRules: [
      { when: [{ field: 'self.originalInspectionType', op: 'is', values: ['pt'] }, { field: 'self.performedInspectionType', op: 'is', values: ['5x'] }], to: 'rejecting-vt5x' },
      { when: [], to: 'rejecting-ndt' },
    ] },
  ENGINEERING_HOLD_STAGE,
];
