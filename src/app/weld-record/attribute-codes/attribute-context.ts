import { Job } from '../../data/jobs';
import { PROGRESSION_ATTRIBUTE_CODES, ProgressionAttributeCode } from '../../data/attribute-codes';

/* every code in the joint's four attribute code slots, trimmed and upper case */
export function jointCodeSlots(job: Job): string[] {
  return [job.attributeCode1, job.attributeCode2, job.attributeCode3, job.attributeCode4]
    .map(c => (c || '').trim().toUpperCase()).filter(Boolean);
}

/* the joint's codes that can change its routing (Admin > Attribute Code Exceptions) */
export function jointAttributeCodes(job: Job): ProgressionAttributeCode[] {
  const codes = jointCodeSlots(job);
  return PROGRESSION_ATTRIBUTE_CODES.filter(a => codes.includes(a.code)).map(a => a.code);
}
