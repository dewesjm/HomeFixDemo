/* Admin > Attribute Code Exceptions: what each attribute code changes on a joint's routing, applied
   after the normal routing is built (Routing Settings, Signoff Types By Routing). One row per code
   and routing. A row names the regular routing and applies to its NQC row too. Stored in localStorage. */
import { STORAGE } from '../../data/storage-keys';
import { ConditionRule } from '../routing/step-conditions';

export type AccessibleAnswer = 'yes' | 'no';

export interface AttributeCodeException {
  code: string;
  /* the regular routing's id; its NQC row reads the same row */
  routing: string;
  /* extra conditions on top of the code being on the joint; none = always */
  when?: ConditionRule[];
  routingChange?: 'add' | 'drop';
  /* only = the routing offers just these Types; add = these Types are offered as well */
  typesMode?: 'only' | 'add';
  types?: string[];
  /* a Type that may be picked only with this answer to "ID is accessible" on the same signoff */
  accessible?: { type: string; answer: AccessibleAnswer }[];
  /* an RT signoff needs at least this Degree of RT Performed */
  minRt?: number;
}

/* what the exceptions left on one routing of a joint, kept on its stage for the form and signoff checks */
export interface AttributeStageRules {
  codes: string[];
  accessible: { type: string; answer: AccessibleAnswer }[];
  minRt?: number;
}

/* Field condition clause ids the Applies when editor offers beyond Joint Details */
export const SHIPBOARD_FIELD = 'fabricationShipboard';
export const ROOT_WELD_PROCESS = 'step.root-weld.weldProcess';
export const FINAL_WELD_PROCESS = 'step.final-weld.weldProcess';

const rtTaken = (field: 'rtRoot' | 'rtFinal'): ConditionRule[] => [[{ field, op: 'isNot', values: ['', 'NA'] }]];
const notMtPt = (field: string): ConditionRule[] => [[{ field, op: 'isNot', values: ['MT', 'PT', 'MT/PT'] }]];
const shop = (field: 'rtRoot' | 'rtFinal'): ConditionRule[] => [[
  { field: SHIPBOARD_FIELD, op: 'is', values: ['No'] }, { field, op: 'isNot', values: ['', 'NA'] },
]];
const gtaw = (field: string): ConditionRule[] => [[{ field, op: 'is', values: ['gtaw'] }]];
const NOT_REQUIRED = 'attribute-not-required';

/* the demo's reading of each code (ATTRIBUTE-CODES-PLAN.md); every row is an assumption to confirm */
export const SEED_EXCEPTIONS: AttributeCodeException[] = [
  { code: 'PR', routing: 'root-ndt-vt5x', typesMode: 'add', types: ['pt'], accessible: [{ type: 'pt', answer: 'yes' }] },
  ...(['root', 'final'] as const).map((phase): AttributeCodeException => ({
    code: 'PR', routing: `${phase}-ndt-utrt`, when: rtTaken(phase === 'root' ? 'rtRoot' : 'rtFinal'),
    typesMode: 'add', types: [NOT_REQUIRED], accessible: [{ type: NOT_REQUIRED, answer: 'yes' }, { type: 'rt', answer: 'no' }],
  })),
  { code: 'PM', routing: 'final-ndt-mtpt', typesMode: 'add', types: ['pt'] },
  ...['FC', 'BJ'].flatMap((code): AttributeCodeException[] => [
    { code, routing: 'final-ndt-vt5x', routingChange: 'add', typesMode: 'only', types: ['vt'] },
    { code, routing: 'final-ndt-mtpt', routingChange: 'drop' },
    { code, routing: 'final-ndt-utrt', routingChange: 'drop' },
  ]),
  { code: 'PU', routing: 'final-ndt-mtpt', routingChange: 'add', typesMode: 'only', types: ['pt'] },
  { code: 'PU', routing: 'final-ndt-utrt', routingChange: 'add', typesMode: 'only', types: ['ut'] },
  ...(['root', 'final'] as const).map((phase): AttributeCodeException => ({
    code: 'SI', routing: `${phase}-ndt-utrt`, when: shop(phase === 'root' ? 'rtRoot' : 'rtFinal'),
    typesMode: 'add', types: ['vt'], accessible: [{ type: 'vt', answer: 'yes' }],
  })),
  { code: 'RX', routing: 'root-ndt-mtpt', routingChange: 'add', typesMode: 'only', types: ['pt'] },
  { code: 'RX', routing: 'final-ndt-utrt', routingChange: 'add', typesMode: 'only', types: ['rt'] },
  ...([['root', 'ndtRoot'], ['layer', 'ndtEach'], ['final', 'ndtFinal']] as const).map(([phase, field]): AttributeCodeException => ({
    code: 'IA', routing: `${phase}-ndt-mtpt`, when: notMtPt(field), routingChange: 'add',
    typesMode: 'only', types: ['pt', 'mt', NOT_REQUIRED], accessible: [{ type: NOT_REQUIRED, answer: 'no' }],
  })),
  ...(['root', 'final'] as const).map((phase): AttributeCodeException => ({
    code: 'IR', routing: `${phase}-ndt-utrt`, when: rtTaken(phase === 'root' ? 'rtRoot' : 'rtFinal'),
    typesMode: 'add', types: ['pt', 'mt'], accessible: [{ type: 'pt', answer: 'yes' }, { type: 'mt', answer: 'yes' }],
  })),
  { code: 'LR', routing: 'layer-ndt-mtpt', when: [[{ field: 'ndtEach', op: 'is', values: ['PT', 'MT/PT'] }]],
    typesMode: 'add', types: ['rt'], minRt: 60 },
  { code: 'GV', routing: 'root-ndt-vt5x', when: gtaw(ROOT_WELD_PROCESS), routingChange: 'add', typesMode: 'only', types: ['5x'] },
  { code: 'GV', routing: 'root-ndt-mtpt', when: gtaw(ROOT_WELD_PROCESS), routingChange: 'drop' },
  { code: 'GV', routing: 'root-ndt-utrt', when: gtaw(ROOT_WELD_PROCESS), routingChange: 'drop' },
  { code: 'GV', routing: 'final-ndt-vt5x', when: gtaw(FINAL_WELD_PROCESS), routingChange: 'add', typesMode: 'only', types: ['vt'] },
  { code: 'GV', routing: 'final-ndt-mtpt', when: gtaw(FINAL_WELD_PROCESS), routingChange: 'drop' },
  { code: 'GV', routing: 'final-ndt-utrt', when: gtaw(FINAL_WELD_PROCESS), routingChange: 'drop' },
  { code: 'RI', routing: 'final-ndt-utrt', routingChange: 'add', typesMode: 'only', types: ['rt', 'pt'],
    accessible: [{ type: 'pt', answer: 'yes' }], minRt: 60 },
  { code: 'BP', routing: 'root-ndt-vt5x', routingChange: 'add', typesMode: 'only', types: ['5x'] },
  { code: 'BP', routing: 'root-ndt-mtpt', routingChange: 'add', typesMode: 'add', types: ['pt', 'mt'] },
];

/* bumped on every save, so stage templates and routing reads know the table changed */
let version = 0;
export const attributeCodeExceptionsVersion = () => version;

export function getAttributeCodeExceptions(): AttributeCodeException[] {
  try {
    const raw = localStorage.getItem(STORAGE.attributeCodeExceptions);
    return raw ? JSON.parse(raw) : SEED_EXCEPTIONS;
  } catch { return SEED_EXCEPTIONS; }
}

export function setAttributeCodeExceptions(rows: AttributeCodeException[]) {
  localStorage.setItem(STORAGE.attributeCodeExceptions, JSON.stringify(rows));
  version++;
}

/* the codes with a row for a routing (its NQC row reads the regular row), for the other admin tables' notes */
export function codesChangingRouting(routingId: string): string[] {
  const id = routingId.replace(/^nqc-/, '');
  return [...new Set(getAttributeCodeExceptions().filter(r => r.routing === id).map(r => r.code))];
}
