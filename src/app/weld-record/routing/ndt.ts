/* NDT inspection steps: one template per phase (root/layer/final) x method, and which of them a
   joint gets from its Joint Details */
import { Job } from '../../data/jobs';
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

/* Each phase's NDT steps come from its Joint Details values (NDT Root + RT Root, NDT Each for
   Layer, NDT Final + RT Final), in 5X/VT, MT/PT, RT/UT order (Layer has none when NDT Each is blank):
     - VT always, or 5X instead when the NDT value is 5X
     - MT, PT or UT adds that step with its Type locked to it; MT/PT adds the MT/PT step with a choice
     - an RT degree (anything but blank or NA) adds the RT/UT step locked to RT
   UT and an RT degree never come together in real data; if they did, that step would offer both. */
interface NdtStep { kind: NdtKind; methods: string[] }

export function phaseNdtSteps(ndtValue: string, rtDegree = ''): NdtStep[] {
  const v = (ndtValue || '').trim().toUpperCase();
  const steps: NdtStep[] = [{ kind: 'vt5x', methods: [v === '5X' ? '5x' : 'vt'] }];
  if (v === 'MT') steps.push({ kind: 'mtpt', methods: ['mt'] });
  if (v === 'PT') steps.push({ kind: 'mtpt', methods: ['pt'] });
  if (v === 'MT/PT') steps.push({ kind: 'mtpt', methods: ['mt', 'pt'] });
  const rt = !!rtDegree && rtDegree !== 'NA';
  if (v === 'UT' || rt) steps.push({ kind: 'utrt', methods: [...(v === 'UT' ? ['ut'] : []), ...(rt ? ['rt'] : [])] });
  return steps;
}

export function jobNdtSteps(job: Job): Record<NdtPhase, NdtStep[]> {
  return {
    root: phaseNdtSteps(job.ndtRoot, job.rtRoot),
    /* Layer NDT only when NDT Each is set */
    layer: (job.ndtEach || '').trim() ? phaseNdtSteps(job.ndtEach).filter(s =>
      ['VT', '5X'].includes(job.ndtEach.trim().toUpperCase()) || s.kind !== 'vt5x') : [],
    final: phaseNdtSteps(job.ndtFinal, job.rtFinal),
  };
}

/* every Type option a kind of NDT stage can offer, before any Joint Details lock */
export function ndtKindOptions(kind: NdtKind): StageOption[] {
  return NDT_KINDS[kind].options.map(o => ({ ...o }));
}

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
