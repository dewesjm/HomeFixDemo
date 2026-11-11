/* The checks that block saving a procedure on its edit form, as the toast to show. The revision-note
   check stays in the form, since it depends on how the procedure was when the form opened. */
import type { Procedure } from '../../../../../data/procedures';
import { sectionsOnProcedure, type ProcedureSection } from '../../../procedure-sections';
import { extraFieldProblems, textValue } from '../../../procedure-field-values';

interface SaveProblem { summary: string; detail: string; }

export function procedureSaveProblem(
  form: Procedure, isNew: boolean, all: Procedure[], sections: ProcedureSection[]
): SaveProblem | null {
  if (!form.id.trim()) return { summary: 'Required fields', detail: 'Procedure ID is required' };
  if (!form.gwp.trim() || !form.wtn.trim()) return { summary: 'Required fields', detail: 'GWP and WTN are required' };
  if (isNew && all.some(p => p.id === form.id)) return { summary: 'Duplicate ID', detail: `${form.id} already exists` };

  const clash = all.find(p => p.id !== form.id && p.gwp === form.gwp && p.wtn === form.wtn);
  if (clash) return { summary: 'Duplicate GWP/WTN', detail: `${clash.id} already covers GWP ${form.gwp} / WTN ${form.wtn}` };

  /* base metal is fixed per GWP (it's what filters the GWP droplist in Weld Record by the job's
     Material Type 1/2) -- every WPS sharing a GWP must agree on it */
  const metals = (p: Procedure) => [textValue(p, 'baseMetal1Type', sections), textValue(p, 'baseMetal2Type', sections)];
  const [m1, m2] = metals(form);
  const mismatch = all.find(p => p.id !== form.id && p.gwp === form.gwp && metals(p).join('/') !== `${m1}/${m2}`);
  if (mismatch) {
    const [o1, o2] = metals(mismatch);
    return { summary: 'Base metal mismatch', detail: `GWP ${form.gwp} is already ${o1 || '-'} / ${o2 || '-'} (see ${mismatch.id})` };
  }

  const problems = extraFieldProblems(sectionsOnProcedure(form.sectionIds, sections).map(s => s.section), form.extraFields);
  if (problems.length) return { summary: 'Required fields', detail: problems.join(' ') };
  return null;
}
