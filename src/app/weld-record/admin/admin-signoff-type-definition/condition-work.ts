/* The condition editor's working copy of a field condition: AND/OR groups of clauses as the admin
   edits them, and the conversion to and from the stored FieldCondition (data/workflow/field-conditions.ts) */
import {
  ConditionClause,
  ConditionTerm,
  FieldCondition,
  conditionGroup,
  conditionOp,
  conditionTerms,
  isConditionGroup,
} from '../../signoff-definition/field-conditions';
import { ENGINEERING_OVERRIDE_KEY, REJECTED_PHASE_UTRT_KEY } from '../../signoff-definition/condition-context';

/* 'engineering' = whether an engineering override has the step; 'rejectedUtrt' = on a Repair, whether
   the rejected phase has an RT/UT step */
export type ClauseSrc = 'field' | 'jointDetail' | 'stepId' | 'engineering' | 'rejectedUtrt';

export interface WorkClause {
  source: ClauseSrc;
  key: string;     /* field key or joint detail key; ignored for stepId, engineering and rejectedUtrt */
  equals: string;  /* value for field/jointDetail; regex for stepId (mapped to 'matches'); 'yes' or '' (on/off) otherwise */
}

export interface WorkGroup {
  op: 'all' | 'any';
  items: WorkTerm[];
}

export type WorkTerm = WorkClause | WorkGroup;

export const isWorkGroup = (t: WorkTerm): t is WorkGroup => 'items' in t;

export const blankClause = (): WorkClause => ({ source: 'field', key: '', equals: '' });

/* "one of" values (anyOf) are edited as a comma-separated list, e.g. "mt, pt" */
function clauseToWork(c: ConditionClause): WorkClause {
  if (c.source === 'stepId') return { source: 'stepId', key: '', equals: c.matches };
  if (c.source === 'stageProperty' && c.key === ENGINEERING_OVERRIDE_KEY) return { source: 'engineering', key: '', equals: c.equals ?? '' };
  if (c.source === 'stageProperty' && c.key === REJECTED_PHASE_UTRT_KEY) return { source: 'rejectedUtrt', key: '', equals: c.equals ?? '' };
  if (c.source === 'field' || c.source === 'jointDetail') return { source: c.source, key: c.key, equals: c.anyOf?.join(', ') ?? c.equals ?? '' };
  return blankClause();
}

function workToClause(w: WorkClause): ConditionClause {
  if (w.source === 'stepId') return { source: 'stepId', matches: w.equals };
  if (w.source === 'engineering') return { source: 'stageProperty', key: ENGINEERING_OVERRIDE_KEY, equals: w.equals };
  if (w.source === 'rejectedUtrt') return { source: 'stageProperty', key: REJECTED_PHASE_UTRT_KEY, equals: w.equals };
  const values = w.equals.split(',').map(v => v.trim()).filter(Boolean);
  return values.length > 1 ? { source: w.source, key: w.key, anyOf: values } : { source: w.source, key: w.key, equals: w.equals };
}

/* a clause left without its field (or its regex) isn't saved */
const isComplete = (w: WorkClause) =>
  w.source === 'engineering' || w.source === 'rejectedUtrt' || (w.source === 'stepId' ? !!w.equals : !!w.key);

export function conditionToWork(c: FieldCondition | undefined): WorkGroup {
  if (!c) return { op: 'all', items: [] };
  return { op: conditionOp(c), items: conditionTerms(c).map(t => isConditionGroup(t) ? conditionToWork(t) : clauseToWork(t)) };
}

/* incomplete clauses and nested groups left empty are dropped; the top group is kept even if empty */
export function workToCondition(g: WorkGroup): FieldCondition {
  const terms = g.items.flatMap((t): ConditionTerm[] => {
    if (isWorkGroup(t)) {
      const inner = workToCondition(t);
      return conditionTerms(inner).length ? [inner] : [];
    }
    return isComplete(t) ? [workToClause(t)] : [];
  });
  return conditionGroup(g.op, terms);
}
