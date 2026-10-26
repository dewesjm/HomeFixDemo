import { Job } from '../../data/jobs';
import { PROGRESSION_ATTRIBUTE_CODES, ProgressionAttributeCode } from '../../data/attribute-codes';
import type { WorkflowStage } from '../model/workflow-types';

export function jointAttributeCodes(job: Job): ProgressionAttributeCode[] {
  const codes = [job.attributeCode1, job.attributeCode2, job.attributeCode3, job.attributeCode4]
    .map(c => (c || '').trim().toUpperCase());
  return PROGRESSION_ATTRIBUTE_CODES.filter(a => codes.includes(a.code)).map(a => a.code);
}

export function activeAttributeCodes(job: Job): ProgressionAttributeCode[] {
  return jointAttributeCodes(job).filter(code => {
    if (code === 'SI') return job.attributeLocation === 'Shop';
    if (code === 'GV') return job.attributeGtaWeld === 'Yes';
    return true;
  });
}

export function attributeConflicts(job: Job, stage?: WorkflowStage): string[] {
  const accessible = stage?.inputs['idAccessible'] === 'yes';
  const phase = stage?.attributeInspection?.phase;
  const codes = activeAttributeCodes(job).filter(code => !['PR', 'IA'].includes(code) || accessible);
  const has = (code: ProgressionAttributeCode) => codes.includes(code);
  const conflicts: string[] = [];
  const finalOnly = codes.filter(c => ['FC', 'BJ', 'GV'].includes(c));
  const finalRequired = codes.filter(c => ['PU', 'RX', 'RI'].includes(c) || (c === 'IA' && phase === 'final'));
  if (finalOnly.length && finalRequired.length) conflicts.push(`Attribute conflict: ${finalOnly.join('/')} requires Final VT only, but ${finalRequired.join('/')} requires another Final inspection.`);
  if (has('GV') && (has('RX') || has('BP') || (has('IA') && phase === 'root'))) conflicts.push('Attribute conflict: GV requires Root VT only, but RX/BP/IA requires Root PT or MT.');
  if (has('PR') && has('RX') && phase === 'final') conflicts.push('Attribute conflict: PR removes RT, but RX requires Final RT.');
  return conflicts;
}

export function attributeContextNotes(job: Job): string[] {
  const active = activeAttributeCodes(job);
  return jointAttributeCodes(job).filter(c => !active.includes(c)).map(code =>
    code === 'GV' ? 'GV: applies only when GTA-only weld is Yes; current requirements retained.'
      : code === 'SI' ? 'SI: applies only to Shop joints; current requirements retained.'
      : `${code}: ID access/visibility is not Yes; current requirements retained.`);
}
