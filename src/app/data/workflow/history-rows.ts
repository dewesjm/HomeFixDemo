/* A joint's History as table rows (History screen, Records Review), and which rows offer
   Deprogress and Correct */
import { Job } from '../jobs';
import { HistoryEntry, JobWorkflow } from './types';

/* one History entry with its joint's identifiers; sign-offs carry inputs (every editable field and its value at that moment) */
export interface HistoryRow extends HistoryEntry {
  key: string;
  jobId: string;
  hull: string;
  drawing: string;
  joint: string;
  order: string;
  /* searchable text of the sign-off's field values */
  inputsText: string;
}

/* the joint's History newest-first; per-field edits (Stages, Fabrication) are left out, since
   History records what was input at each sign-off */
export function historyRows(wf: JobWorkflow, job: Job | undefined): HistoryRow[] {
  return wf.history
    .filter(e => e.section !== 'Stages' && e.section !== 'Fabrication')
    .map(e => ({
      ...e,
      key: `${wf.jobId}|${e.when}|${e.action}`,
      jobId: wf.jobId,
      hull: job?.hull ?? `#${wf.jobId}`,
      drawing: job?.drawing ?? '',
      joint: job?.joint ?? '',
      order: job?.order ?? '',
      inputsText: [...(e.inputs ?? []), ...(e.fabInputs ?? [])].map(i => `${i.label} ${i.value}`).join(' '),
    }))
    .sort((a, b) => b.when.localeCompare(a.when));
}

/* Deprogress is only offered on a joint's last sign-off that is still in effect. A joint with undo
   entries (signed in this app) offers it on the sign-off its newest undo entry belongs to. Otherwise
   (seeded demo signoffs) it's worked out from the joint's whole history: a deprogress cancels the
   sign-off before it, and the entry must also be the workflow's last signed stage, since that is
   what deprogress reverses. `rows` is historyRows() for this joint, unfiltered. */
export function deprogressableKey(wf: JobWorkflow, rows: HistoryRow[]): string | undefined {
  const top = wf.undo?.at(-1);
  if (top) return rows.find(r => r.when === top.historyWhen && (r.section === 'Sign-off' || r.section === 'Release'))?.key;
  const inEffect: HistoryRow[] = [];
  for (const r of rows.filter(r => r.section === 'Sign-off').sort((a, b) => a.when.localeCompare(b.when))) {
    if (/deprogressed/i.test(r.action)) inEffect.pop();
    else inEffect.push(r);
  }
  const last = inEffect.at(-1);
  if (!last) return undefined;
  /* by stage id where the row has one: the action text can name the routing option instead of
     the stage (Weld Build-Up, Interim/Final Layer). Older saved entries use an em-dash separator. */
  const expected = wf.stages.filter(s => s.signed).pop();
  if (expected && (last.stageId ? last.stageId !== expected.id : last.action.split(/ [-—] /)[0] !== expected.label)) return undefined;
  return last.key;
}

/* Correct is offered on a stage's current sign-off: the latest Sign-off entry for that stage, as
   long as it isn't itself a deprogress and the stage is still signed. Unlike Deprogress, Correct
   can fix an earlier stage after later ones have been signed. */
export function correctableKeys(wf: JobWorkflow, rows: HistoryRow[]): string[] {
  const latest = new Map<string, HistoryRow>();
  for (const r of rows) {
    if (r.section !== 'Sign-off' || !r.stageId) continue;
    const cur = latest.get(r.stageId);
    if (!cur || r.when.localeCompare(cur.when) >= 0) latest.set(r.stageId, r);
  }
  return [...latest.entries()]
    .filter(([stageId, r]) => !/deprogressed/i.test(r.action) && wf.stages.find(s => s.id === stageId)?.signed)
    .map(([, r]) => r.key);
}
