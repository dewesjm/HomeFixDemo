/* What the joint page loaded with, and whether anything typed since then would be lost by leaving
   (the leave-page guard). Signing commits; leaving discards (discardUnsignedEdits). */
import { JobWorkflow, WorkflowStage } from '../workflow';

export interface LoadedJoint {
  fabricationData: Record<string, string>;
  stages: Record<string, WorkflowStage>;
}

export function captureLoaded(wf: JobWorkflow): LoadedJoint {
  const stages: Record<string, WorkflowStage> = {};
  for (const s of wf.stages) {
    stages[s.id] = { ...s, inputs: { ...s.inputs }, signoffInputs: { ...s.signoffInputs }, fields: [...s.fields], signoffFields: [...s.signoffFields] };
  }
  return { fabricationData: { ...wf.fabricationData }, stages };
}

function recordEquals(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? '') !== (b[k] ?? '')) return false;
  return true;
}

/* true when Fab or step data was entered on an unsigned stage and not yet signed. `kept` gives the
   values on a stage that survive leaving anyway (an engineering override's), so they don't count. */
export function hasUnsavedEdits(wf: JobWorkflow, loaded: LoadedJoint, kept: (stage: WorkflowStage) => Record<string, string>): boolean {
  const fitSigned = wf.stages.find(s => s.id === 'fit')?.signed ?? false;
  if (!fitSigned && !recordEquals(wf.fabricationData, loaded.fabricationData)) return true;
  for (const s of wf.stages) {
    if (s.signed) continue;
    const snap = loaded.stages[s.id];
    if (!snap) continue;
    if (!recordEquals(s.inputs, { ...snap.inputs, ...kept(s) })) return true;
    if (!recordEquals(s.signoffInputs, snap.signoffInputs)) return true;
    if (s.routingType !== snap.routingType) return true;
  }
  return false;
}
