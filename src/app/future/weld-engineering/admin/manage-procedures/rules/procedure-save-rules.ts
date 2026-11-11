/* The checks that block saving a procedure on its edit form, as the toast to show. The revision-note
   check stays in the form, since it depends on how the procedure was when the form opened. */
import { isProcedure, procedureName, type Procedure } from '../../../../../data/procedures';
import { sectionsOnProcedure, type ProcedureSection } from '../../../procedure-sections';
import { extraFieldProblems, textValue } from '../../../procedure-field-values';

interface SaveProblem { summary: string; detail: string; }

/* others: every procedure except the one being edited */
export function procedureSaveProblem(
  form: Procedure, others: Procedure[], sections: ProcedureSection[]
): SaveProblem | null {
  if (!form.gwp.trim() || !form.wtn.trim()) return { summary: 'Required fields', detail: 'GWP and WTN are required' };

  if (others.some(p => isProcedure(p, form.gwp, form.wtn))) {
    return { summary: 'Duplicate GWP/WTN', detail: `${procedureName(form)} already exists` };
  }

  /* base metal is fixed per GWP (it's what filters the GWP droplist in Weld Record by the job's
     Material Type 1/2) -- every WTN under a GWP must agree on it */
  const metals = (p: Procedure) => [textValue(p, 'baseMetal1Type', sections), textValue(p, 'baseMetal2Type', sections)];
  const [m1, m2] = metals(form);
  const mismatch = others.find(p => p.gwp === form.gwp && metals(p).join('/') !== `${m1}/${m2}`);
  if (mismatch) {
    const [o1, o2] = metals(mismatch);
    return { summary: 'Base metal mismatch', detail: `GWP ${form.gwp} is already ${o1 || '-'} / ${o2 || '-'} (see WTN ${mismatch.wtn})` };
  }

  const problems = extraFieldProblems(sectionsOnProcedure(form.sectionIds, sections).map(s => s.section), form.extraFields);
  if (problems.length) return { summary: 'Required fields', detail: problems.join(' ') };
  return null;
}
