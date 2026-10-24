/* NDT inspection steps: one template per phase (root/layer/final) x method, and which of them a
   joint gets from its Joint Details */
import { StageOption, StageTemplate } from '../model/workflow-types';

export type NdtPhase = 'root' | 'layer' | 'final';
export type NdtKind = 'utrt' | 'mtpt' | 'vt5x';

/* Degree of RT required/performed: NA, or a number of degrees, in number order. Shared by the
   Degree of RT Performed signoff field and Job.rtRoot/rtFinal (the performed degree must be at least the
   required one before its RT NDT stage can be signed off -- see signProblems() in weld-record/joint-page/rules/sign-validation.ts). */
export const RT_DEGREE_OPTIONS: { label: string; value: string }[] =
  ['NA', '10', '60', '75', '100', '360'].map(v => ({ label: v, value: v }));

/* a Degree of RT as a number; NA or blank is 0 */
export function rtDegrees(value: string | undefined): number {
  const n = Number(value);
  return value && Number.isFinite(n) ? n : 0;
}

export const NDT_KINDS: Record<NdtKind, { label: string; options: StageOption[] }> = {
  utrt: { label: 'RT/UT', options: [{ label: 'RT', value: 'rt' }, { label: 'UT', value: 'ut' }] },
  mtpt: { label: 'MT/PT', options: [{ label: 'MT', value: 'mt' }, { label: 'PT', value: 'pt' }] },
  vt5x: { label: '5X/VT', options: [{ label: 'VT', value: 'vt' }, { label: '5X', value: '5x' }] },
};

export function ndtStage(phase: NdtPhase, kind: NdtKind): StageTemplate {
  const k = NDT_KINDS[kind];
  return {
    id: `${phase}-ndt-${kind}`,
    label: `${phase[0].toUpperCase()}${phase.slice(1)} NDT ${k.label}`,
    required: true,
    role: 'Inspector',
    rejectToStage: 'repair',
    decisionLabel: 'Inspection Results',
  };
}
