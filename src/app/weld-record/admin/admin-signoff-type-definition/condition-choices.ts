/* The one list a Signoff Type Forms condition clause picks from: this form's fields, Joint Details,
   Fabrication and the clauses that aren't about a field, each named by where it comes from. */
import { ConditionCatalogField, JOINT_AND_FABRICATION_FIELDS } from '../../routing/condition-catalog';
import type { StepFieldChoice } from './condition-group-editor.component';
import { ClauseSrc, WorkClause } from './condition-work';
import type { SearchChoice } from './searchable-select.component';

/* an entry of the list, with the clause picking it starts */
export interface ClauseChoice extends SearchChoice {
  clause: WorkClause;
}

/* a field clause with no field yet is the list's empty entry */
export function clauseChoiceId(c: Pick<WorkClause, 'source' | 'key'>): string {
  if (c.source !== 'field' && c.source !== 'jointDetail') return c.source;
  return c.key ? `${c.source}|${c.key}` : '';
}

const choice = (source: ClauseSrc, key: string, equals: string, label: string): ClauseChoice => {
  const clause = { source, key, equals };
  return { id: clauseChoiceId(clause), label, clause };
};

/* Fabrication's own entries already start with the word */
function catalogLabel(f: ConditionCatalogField): string {
  return f.group === 'Fabrication' && f.label.startsWith('Fabrication') ? f.label : `${f.group}: ${f.label}`;
}

/* Prepopulated from's condition reads only the step itself (stepOnly) */
export function clauseChoices(stepFields: StepFieldChoice[], stepOnly: boolean): ClauseChoice[] {
  const form = stepFields.map(f => choice('field', f.key, f.yesNo ? 'yes' : '', `This form: ${f.label}`));
  const engineering = choice('engineering', '', '', 'Engineering override');
  if (stepOnly) return [...form, engineering];
  return [
    ...form,
    ...JOINT_AND_FABRICATION_FIELDS.map(f => choice('jointDetail', f.key, f.values.join() === 'Yes,No' ? 'Yes' : '', catalogLabel(f))),
    choice('stepId', '', '', 'Routing ID matches'),
    choice('rejectedUtrt', '', 'yes', 'Rejected phase has RT/UT'),
    engineering,
  ];
}

/* a saved clause the list doesn't offer still shows, first */
export function withSavedChoice(choices: ClauseChoice[], clause: WorkClause): ClauseChoice[] {
  const id = clauseChoiceId(clause);
  if (!id || choices.some(c => c.id === id)) return choices;
  const label = clauseChoices([], false).find(c => c.id === id)?.label
    ?? `${clause.source === 'field' ? 'This form' : 'Joint Details'}: ${clause.key}`;
  return [{ ...choice(clause.source, clause.key, '', label) }, ...choices];
}
