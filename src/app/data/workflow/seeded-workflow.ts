/* Demo data: each job's workflow with a deterministic run of steps already signed, so joints sit at
   different points in their routing. A few are seeded on Fit-Up Release, Engineering Hold or Repair.
   Saved (real) workflows always replace this. */
import { Job } from '../jobs';
import { SEEDED_INSPECTOR_NAMES, stampWho } from '../people';
import { inspectionProcedureOptions } from '../inspection-procedures';
import { DEFAULT_REJECT_RULES } from '../step-conditions';
import { DeviationItem, JobWorkflow, StageField, StageResult, WorkflowStage } from './types';
import { hasDecision } from './stage-rules';
import { fieldsShown, labelFor, snapshotInputs } from './stage-display';
import { excavationNdtStageFor, insertEngineeringHold, nextRepairStage, rejectHoldReason, stageFromTemplate } from './added-steps';
import { setRoutingFrom } from './current-routing';
import { baseStepId, isFitupInspId } from './step-ids';
import { newWorkflow } from './build-stages';
import { seeded, seededMic } from './seed-fabrication';

/* which jobs get each seeded situation: a job id hash modulo EVERY equal to AT */
const SEEDED_REPAIR_EVERY = 23;
const SEEDED_REPAIR_AT = 11;
const SEEDED_PT_HOLD_EVERY = 8;
const SEEDED_PT_HOLD_AT = 6;
const SEEDED_HOLD_STEPS = ['tack', 'root-weld', 'root-layer', 'final-weld'];
const SEEDED_HOLD_EVERY = 23;
const PHASE_WELD_STEP: Record<string, string> = { root: 'root-weld', layer: 'root-layer', final: 'final-weld' };

type SignFn = (s: WorkflowStage, inputs: Record<string, string>, signoffInputs: Record<string, string>,
  inspectionType: string, result: StageResult, who: string) => WorkflowStage;

/* how many leading stages are already signed off — varies the "current routing" per job.
   Deterministic per job: ensures coverage of every stage including all NDT types. Only a joint still
   on its first step (Pre-Fit, or Fit when the joint has no Pre-Fit) starts with no history: any
   count past that signs at least the first required step. */
function signedStageCount(job: Job, total: number): number {
  if (total <= 0) return 0;
  // Cycle through all stages so every position gets represented
  const id = String(job.id);
  return Math.abs(id.charCodeAt(0) * 7 + id.charCodeAt(1) * 3) % total;
}

/* plausible recorded value for a seeded, already-signed stage field */
function seededFieldValue(f: StageField, rand: () => number): string {
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  if (f.type === 'select' && f.options?.length) {
    return f.options[Math.floor(rand() * f.options.length)].value;
  }
  /* checkboxes: signed verifications are checked, the rest left unchecked */
  if (f.type === 'checkbox') return f.key.startsWith('verify') ? 'yes' : '';
  if (f.type === 'number') return String(1 + Math.floor(rand() * 120));
  if (f.type === 'text' && /mic$|^(consumableinsertid|backingringid)$/i.test(f.key)) return seededMic(rand);
  if (f.placeholder && f.placeholder.startsWith('e.g. ')) return f.placeholder.slice(5);
  /* fallback realistic values based on key patterns */
  const key = f.key.toLowerCase();
  if (key.includes('name') || key.includes('inspector')) return pick(['J. Carter', 'M. Nguyen', 'R. Patel', 'S. Williams', 'T. Garcia', 'A. Singh', 'K. Brown', 'L. Chen']);
  if (key.includes('license') || key.includes('lic')) return `LIC-${1000 + Math.floor(rand() * 9000)}`;
  if (key.includes('brand') || key.includes('penetrant')) return pick(['Magnaflux', 'Sherwin', 'NDT Systems', 'Spotcheck']);
  if (key.includes('manufacturer')) return pick(['Magnaflux Corp', 'Sherwin Williams', 'NDT Systems Inc']);
  if (key.includes('procedure') || key.includes('method')) return pick(['ASME V', 'AWS D1.1', 'ISO 17636', 'ISO 3452']);
  if (key.includes('thickness')) return pick(['3/8"', '1/2"', '5/8"', '3/4"', '1"']);
  if (key.includes('wps')) return pick(['WPS-001', 'WPS-002', 'WPS-003']);
  if (key.includes('date')) return new Date(Date.now() - Math.floor(rand() * 30) * 86400000).toISOString().slice(0, 10);
  if (key.includes('note') || key.includes('comment')) return pick(['Standard procedure followed', 'No issues noted', 'Completed per spec', 'All criteria met']);
  return pick(['Completed', 'Verified', 'Accepted', 'Passed']);
}

/* a fresh workflow with a deterministic run of leading stages pre-signed (accepted, apart from the
   few seeded Engineering Hold and Repair joints), so the current stage differs job-to-job */
export function seededWorkflow(job: Job): JobWorkflow {
  const wf = newWorkflow(job);
  const total = wf.stages.length;
  /* a handful of jobs wait at Fit-Up Release for a Foreman: everything up to it signed, release box unchecked */
  const releaseIdx = wf.stages.findIndex(s => s.id === 'fitup-release');
  const awaitingRelease = releaseIdx >= 0 && [...job.id].reduce((a, c) => a + c.charCodeAt(0) * 31, 0) % 60 === 0;
  const k = awaitingRelease ? releaseIdx : signedStageCount(job, total);
  if (k <= 0) return wf;

  const rand = seeded(job.id.charCodeAt(0) * 97 + job.id.charCodeAt(1) * 13);
  const DAY = 24 * 60 * 60 * 1000, MIN = 60 * 1000;
  let t = Date.now() - (2 + Math.floor(rand() * 40)) * DAY;

  const names = SEEDED_INSPECTOR_NAMES;
  /* a few joints wait on Engineering Hold: their last signed step was a welding step signed with
     an Actual PH Max over the procedure's range (seededDeviation) */
  let lastSigned = -1;
  wf.stages.forEach((s, i) => { if (i < k && s.required) lastSigned = i; });
  const idHash = [...job.id].reduce((a, c) => a + c.charCodeAt(0) * 17, 0);
  const holdAt = !awaitingRelease && SEEDED_HOLD_STEPS.includes(wf.stages[lastSigned]?.id)
    && idHash % SEEDED_HOLD_EVERY === 5 ? lastSigned : -1;
  /* and a few after a PT failure on a GTAW weld (the built-in reject rule): that phase's weld step
     is GTAW, its NDT MT/PT was signed PT and UNSAT */
  const ptPhase = /^(root|layer|final)-ndt-mtpt$/.exec(baseStepId(wf.stages[lastSigned]?.id ?? ''))?.[1];
  const ptAllowed = !!wf.stages[lastSigned]?.typeOptions?.some(o => o.value === 'pt');
  const ptHoldAt = !awaitingRelease && ptPhase && ptAllowed && idHash % SEEDED_PT_HOLD_EVERY === SEEDED_PT_HOLD_AT ? lastSigned : -1;
  const ptWeldId = ptPhase ? PHASE_WELD_STEP[ptPhase] : '';
  /* and a handful whose last NDT (5X/VT or RT/UT) was UNSAT, so they wait on Repair; a couple of those
     had a Weld Repair signed and wait on Excavation NDT. MT/PT is left out so the PT reject rule can't apply. */
  const repairPhase = /^(root|layer|final)-ndt-(vt5x|utrt)$/.exec(baseStepId(wf.stages[lastSigned]?.id ?? ''))?.[1];
  const repairAt = !awaitingRelease && holdAt < 0 && ptHoldAt < 0 && repairPhase
    && idHash % SEEDED_REPAIR_EVERY === SEEDED_REPAIR_AT ? lastSigned : -1;
  const repairSigned = repairAt >= 0 && job.id.charCodeAt(4) % 3 === 0;

  /* one seeded sign-off: History entry plus the signed stage */
  const sign: SignFn = (s, inputs, signoffInputs, inspectionType, result, who) => {
    const signedView = { ...s, inspectionType, inputs, signoffInputs, result };
    wf.history.push({
      when: new Date(t).toISOString(),
      who,
      ...stampWho(who),
      section: 'Sign-off',
      action: s.label,
      from: '',
      to: hasDecision(s) ? result.toUpperCase() : '',
      routing: s.label,
      inputs: snapshotInputs(signedView, fieldsShown(signedView, job), s.signoffFields),
      stageId: s.id,
    });
    return {
      ...s,
      inspectionType,
      inputs,
      signoffInputs,
      result,
      signed: true,
      signedAt: new Date(t).toISOString(),
    };
  };

  wf.stages = wf.stages.map((s, i) => {
    if (i >= k) return awaitingRelease && i === releaseIdx ? { ...s, required: true } : s;
    /* steps the joint skipped (Fit-Up Release, Deferred Tack) aren't signed */
    if (!s.required) return s;
    t += (20 + Math.floor(rand() * 180)) * MIN;
    const inputs = { ...s.inputs };
    for (const f of s.fields) inputs[f.key] = seededFieldValue(f, rand);
    if (awaitingRelease && isFitupInspId(s.id)) inputs['releaseToWelding'] = '';
    if (ptHoldAt >= 0 && s.id === ptWeldId) inputs['weldProcess'] = 'gtaw';
    if (i === holdAt) {
      const [lo, hi] = [Number(inputs['phMin']), Number(inputs['phMax'])].sort((a, b) => a - b);
      Object.assign(inputs, { phMin: String(lo), phMax: String(hi), actualPhMin: String(lo), actualPhMax: String(hi + 15) });
    }
    const signoffInputs: Record<string, string> = {};
    for (const f of s.signoffFields) {
      if (f.key === 'inspectorName') signoffInputs[f.key] = job.technician;
      else if (f.key === 'licenseNo') signoffInputs[f.key] = `LIC-${1000 + Math.floor(rand() * 9000)}`;
      else signoffInputs[f.key] = seededFieldValue(f, rand);
    }
    /* seeded joints didn't defer their Tack */
    if (s.id === 'fit') signoffInputs['deferTack'] = '';
    const who = signoffInputs['inspectorName'] || names[Math.floor(rand() * names.length)];
    const opts = s.typeOptions ?? [];
    const inspectionType = i === ptHoldAt ? 'pt' : s.inspectionType || (opts.length ? opts[job.id.charCodeAt(2) % opts.length].value : '');
    /* a procedure designated for the step's Type (picked without rand, so other seeds don't shift) */
    if ('procedureUsed' in inputs) {
      const procs = inspectionProcedureOptions(inspectionType);
      inputs['procedureUsed'] = procs.length ? procs[job.id.charCodeAt(3) % procs.length].value : '';
    }
    const result: StageResult = i === ptHoldAt || i === repairAt ? 'unsat' : 'sat';
    return sign(s, inputs, signoffInputs, inspectionType, result, who);
  });
  if (holdAt >= 0) seededDeviation(wf, holdAt, t + (5 + Math.floor(rand() * 30)) * MIN);
  if (ptHoldAt >= 0) {
    const st = wf.stages[ptHoldAt];
    const rule = DEFAULT_REJECT_RULES[st.id][0];
    wf.stages = insertEngineeringHold(wf.stages, st.id, rejectHoldReason(st, rule));
  }
  if (repairAt >= 0) seededRepair(wf, job, repairAt, repairSigned, sign, () => {
    t += (30 + Math.floor(rand() * 240)) * MIN;
    return names[Math.floor(rand() * names.length)];
  });
  return wf;
}

/* the Repair a seeded NDT UNSAT adds right after it (as SignoffService does); when `signed`, a Foreman
   signed it as a Weld Repair, which adds Excavation NDT with the method that failed */
function seededRepair(wf: JobWorkflow, job: Job, idx: number, signed: boolean, sign: SignFn, nextSigner: () => string) {
  const ndt = wf.stages[idx];
  let repair = stageFromTemplate(nextRepairStage(wf.stages), {
    originPhase: baseStepId(ndt.id).split('-ndt-')[0], originStageId: ndt.id, originInspectionType: ndt.inspectionType,
  });
  wf.repairNumber = '01';
  if (signed) {
    const who = nextSigner();
    repair = sign(repair, { ...repair.inputs, repairType: 'weld-repair', allowableThicknessExceeded: '' }, {}, repair.inspectionType, 'sat', who);
  }
  const added = signed ? [repair, excavationNdtStageFor(job, ndt.inspectionType, repair.id)] : [repair];
  wf.stages = setRoutingFrom([...wf.stages.slice(0, idx + 1), ...added, ...wf.stages.slice(idx + 1)], repair.id);
}

/* a seeded joint's accepted deviation on stage `idx` and the Engineering Hold it put the joint on */
function seededDeviation(wf: JobWorkflow, idx: number, t: number) {
  const s = wf.stages[idx];
  const item: DeviationItem = {
    kind: 'out-of-range', label: labelFor(s, 'actualPhMax'), entered: s.inputs['actualPhMax'],
    required: `${s.inputs['phMin']} to ${s.inputs['phMax']}`,
  };
  const reason = 'Reading taken after a delay; value recorded as measured.';
  const when = new Date(t).toISOString();
  wf.stages = insertEngineeringHold(wf.stages, s.id);
  const holdStageId = wf.stages[idx + 1].id;
  wf.deviations = [{ id: `seed-${wf.jobId}`, stageId: s.id, stageLabel: s.label, items: [item], reason, who: wf.technician, when, status: 'open', holdStageId }];
  wf.history.push({
    when, who: wf.technician, ...stampWho(wf.technician), section: 'Deviation',
    action: `${s.label} - Deviation created`, from: '', to: item.label, routing: s.label,
    inputs: [{ label: 'Reason', value: reason }, { label: item.label, value: `${item.entered} (required: ${item.required})` }],
  });
}
