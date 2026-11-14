/* The checks that block saving a procedure, run by the procedure service on every write (edit form,
   Load Procedures, Admin > Services). Each answers a short title and a message. The revision note
   check is in procedure-service.ts, since it depends on the stored procedure. */
import { isProcedure, procedureName, type Procedure } from '../../../data/procedures';
import { sectionsOnProcedure, type ProcedureSection } from '../procedure-sections';
import { extraFieldProblems, fieldChoices, textValue } from '../procedure-field-values';

interface SaveProblem { summary: string; detail: string; }

/* others: every procedure except the one being saved */
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

/* A changed list, multi or table value on a section the procedure has must be one of that field's
   choices. Only changed values are checked, so a procedure keeps a value whose choice was later
   removed from the field until someone changes it. before: the stored values (empty for a new one). */
export function choiceProblem(
  form: Procedure, before: Procedure['extraFields'], sections: ProcedureSection[]
): SaveProblem | null {
  for (const { section } of sectionsOnProcedure(form.sectionIds, sections)) {
    for (const f of section.fields) {
      if (f.type !== 'list' && f.type !== 'multi' && f.type !== 'table') continue;
      const v = form.extraFields[f.key];
      if (JSON.stringify(v) === JSON.stringify(before[f.key])) continue;
      const picked = (Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? [v] : []);
      const allowed = fieldChoices(f, picked).map(o => o.value);
      const wrong = picked.filter(x => !allowed.includes(x));
      if (wrong.length) return { summary: 'Not a choice', detail: `${f.label} (${f.key}) doesn't allow ${wrong.join(', ')}.` };
    }
  }
  return null;
}
