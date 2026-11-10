/* Admin > Signoff Type to Routing rows: which Types (Admin > Signoff Types) each routing offers, its
   default Type, when each Type is enabled, and the Type source and exceptions for Excavation NDT. The
   starting rows, load and save (localStorage). The rules that read them are in
   weld-record/signoff-forms/signoff-type-routing-rules.ts. */
import { STORAGE } from './storage-keys';
import { TypeException } from '../weld-record/signoff-forms/type-exceptions';
import { ConditionRule } from '../weld-record/conditions/joint-conditions';
import { NDT_KINDS } from './welding-steps';
import { PHASE_NDT_KINDS, nqcStepId } from './welding-step-ids';
import { WELD_BUILDUP_TYPE, signoffTypesVersion } from './signoff-types';

/* one Type a step offers, by its Signoff Types value */
export interface AvailableType {
  type: string;
  default?: boolean;
  enableWhen?: ConditionRule[];
}

export interface SignoffTypeRoutingRow {
  stepId: string;
  types: AvailableType[];
  typeSource?: 'rejecting-inspection';
  typeExceptions?: TypeException[];
}

export const REPAIR_TYPE_ROW = 'repair';
export const EXCAVATION_TYPE_ROW = 'excavation-ndt';
export const NQC_EXCAVATION_TYPE_ROW = 'nqc-excavation-ndt';

const only = (type: string): AvailableType[] => [{ type, default: true }];

/* NDT rows have no default: the inspector picks the inspection performed. Each NDT step's NQC row
   (welding-step-ids.ts) gets its own row too. */
const ndtRows = (phase: 'root' | 'layer' | 'final'): SignoffTypeRoutingRow[] => PHASE_NDT_KINDS[phase]
  .flatMap(kind => [`${phase}-ndt-${kind}`, nqcStepId(`${phase}-ndt-${kind}`)]
    .map(stepId => ({ stepId, types: NDT_KINDS[kind].options.map(o => ({ type: o.value, enableWhen: inspectionEnableWhen(phase, o.value) })) })));

/* Default availability belongs to the routing's Type configuration, not the builder. */
function inspectionEnableWhen(phase: string, type: string): ConditionRule[] {
  const field = phase === 'root' ? 'ndtRoot' : phase === 'layer' ? 'ndtEach' : 'ndtFinal';
  if (type === 'vt') return [[{ field, op: 'isNot', values: ['5X'] }]];
  if (type === '5x') return [[{ field, op: 'is', values: ['5X'] }],
    [{ field: 'self.returningInspectionType', op: 'is', values: ['5x'] }]];
  if (type === 'rt') return [[{ field: phase === 'root' ? 'rtRoot' : 'rtFinal', op: 'isNot', values: ['', 'NA'] }]];
  return [[{ field, op: 'is', values: type === 'mt' ? ['MT', 'MT/PT'] : type === 'pt' ? ['PT', 'MT/PT'] : ['UT'] }]];
}

const SEED_ROWS: SignoffTypeRoutingRow[] = [
  { stepId: 'pre-fit', types: only('pre-fit') },
  { stepId: 'fit', types: [{ type: 'fit', default: true }, { type: WELD_BUILDUP_TYPE }] },
  { stepId: 'tack', types: only('tack') },
  { stepId: 'fitup-insp', types: only('fitup-insp') },
  { stepId: nqcStepId('fitup-insp'), types: only('fitup-insp') },
  { stepId: 'fitup-release', types: only('fitup-release') },
  { stepId: 'deferred-tack', types: only('deferred-tack') },
  { stepId: 'root-weld', types: only('root') },
  ...ndtRows('root'),
  { stepId: 'root-layer', types: [{ type: 'interim', default: true }, { type: 'final-weld' }] },
  ...ndtRows('layer'),
  { stepId: 'final-weld', types: only('final-weld') },
  ...ndtRows('final'),
  { stepId: 'review-o63', types: only('review-o63') },
  { stepId: 'review-o04', types: only('review-o04') },
  { stepId: 'sold', types: only('sold') },
  { stepId: REPAIR_TYPE_ROW, types: only('repair') },
  { stepId: NQC_EXCAVATION_TYPE_ROW, types: [], typeSource: 'rejecting-inspection',
    typeExceptions: [{ from: 'pt', to: '5x', when: [[{ field: 'material.nonFerrous', op: 'is', values: ['Yes'] }], [{ field: 'material.austenitic', op: 'is', values: ['Yes'] }]] }] },
  { stepId: EXCAVATION_TYPE_ROW, types: [], typeSource: 'rejecting-inspection',
    typeExceptions: [{ from: 'pt', to: '5x', when: [[{ field: 'material.nonFerrous', op: 'is', values: ['Yes'] }], [{ field: 'material.austenitic', op: 'is', values: ['Yes'] }]] }] },
];

/* bumped on every save of this table or of Signoff Types, so getTemplates() knows its cached
   options are out of date */
let version = 0;
export const signoffTypeRoutingVersion = () => version * 1000 + signoffTypesVersion();

export function getSignoffTypeRoutingRows(): SignoffTypeRoutingRow[] {
  try {
    const raw = localStorage.getItem(STORAGE.signoffTypeRouting);
    return raw ? JSON.parse(raw) as SignoffTypeRoutingRow[] : SEED_ROWS;
  } catch { return SEED_ROWS; }
}

export function setSignoffTypeRoutingRows(rows: SignoffTypeRoutingRow[]) {
  localStorage.setItem(STORAGE.signoffTypeRouting, JSON.stringify(rows));
  version++;
}
