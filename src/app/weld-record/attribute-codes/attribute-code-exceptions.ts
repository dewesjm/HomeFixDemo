/* Admin > Attribute Code Exceptions: what each attribute code changes on a joint's routing, applied
   after the normal routing is built (Routing Settings, Signoff Types By Routing). One row per code
   and routing. A row names the regular routing and applies to its NQC row too, unless appliesTo
   limits it to one of the pair. Stored in localStorage. */
import { STORAGE } from '../../data/storage-keys';
import { ConditionRule } from '../routing/step-conditions';

export type AccessibleAnswer = 'yes' | 'no';
/* which row of an NQC pair a row covers; omitted = both */
export type NqcScope = 'regular' | 'nqc';

export interface AttributeCodeException {
  code: string;
  /* the regular routing's id; its NQC row reads the same row unless appliesTo says otherwise */
  routing: string;
  appliesTo?: NqcScope;
  /* extra conditions on top of the code being on the joint; none = always */
  when?: ConditionRule[];
  routingChange?: 'add' | 'drop';
  /* only = the routing offers just these Types; add = these Types are offered as well */
  typesMode?: 'only' | 'add';
  types?: string[];
  /* a Type that may be picked only with this answer to "ID is accessible" on the same signoff */
  accessible?: { type: string; answer: AccessibleAnswer }[];
  /* "ID is accessible" must be answered on the signoff, whatever the Type */
  askAccessible?: boolean;
  /* an RT signoff needs at least this Degree of RT Performed */
  minRt?: number;
}

/* what the exceptions left on one routing of a joint, kept on its stage for the form and signoff checks */
export interface AttributeStageRules {
  codes: string[];
  accessible: { type: string; answer: AccessibleAnswer }[];
  askAccessible?: boolean;
  minRt?: number;
}

/* Field condition clause ids the Applies when editor offers beyond Joint Details */
export const SHIPBOARD_FIELD = 'fabricationShipboard';
export const ROOT_WELD_PROCESS = 'step.root-weld.weldProcess';
export const FINAL_WELD_PROCESS = 'step.final-weld.weldProcess';

const rtTaken = (field: 'rtRoot' | 'rtFinal'): ConditionRule[] => [[{ field, op: 'isNot', values: ['', 'NA'] }]];
/* the routing (or its NQC row) was signed with "ID is accessible" Yes */
const signedAccessible = (routing: string): ConditionRule[] => [routing, `nqc-${routing}`]
  .map(id => [{ field: `step.${id}.idAccessible`, op: 'is', values: ['yes'] }]);
const notMtPt = (field: string): ConditionRule[] => [[{ field, op: 'isNot', values: ['MT', 'PT', 'MT/PT'] }]];
const shop = (field: 'rtRoot' | 'rtFinal'): ConditionRule[] => [[
  { field: SHIPBOARD_FIELD, op: 'is', values: ['No'] }, { field, op: 'isNot', values: ['', 'NA'] },
]];
const gtaw = (field: string): ConditionRule[] => [[{ field, op: 'is', values: ['gtaw'] }]];

/* the demo's reading of each code (ATTRIBUTE-CODES-PLAN.md); every row is an assumption to confirm */
export const SEED_EXCEPTIONS: AttributeCodeException[] = [
  /* PR, confirmed 2026-10-27: Final PT of the weld root from the inside replaces Final RT */
  { code: 'PR', routing: 'final-ndt-mtpt', askAccessible: true },
  { code: 'PR', routing: 'final-ndt-utrt', when: signedAccessible('final-ndt-mtpt'), routingChange: 'drop' },
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
    typesMode: 'only', types: ['pt', 'mt'], askAccessible: true,
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

/* whether a row covers this routing: the regular id, or its NQC row ('nqc-<id>') */
export function rowCoversRouting(row: AttributeCodeException, routingId: string): boolean {
  const nqc = routingId.startsWith('nqc-');
  return row.routing === routingId.replace(/^nqc-/, '') && (!row.appliesTo || (row.appliesTo === 'nqc') === nqc);
}

/* the codes with a row for a routing, for the other admin tables' notes */
export function codesChangingRouting(routingId: string): string[] {
  return [...new Set(getAttributeCodeExceptions().filter(r => rowCoversRouting(r, routingId)).map(r => r.code))];
}
