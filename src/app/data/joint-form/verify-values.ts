/* The values Fit-Up Insp and the Records Reviews check off, shown beside each verification checkbox */
import { Job } from '../jobs';
import { fabricationDisplayValue } from './fabrication-form';

/* Fit-Up Insp checkbox -> the Fabrication value it verifies */
const FAB_VERIFY_MAP: Record<string, string> = {
  verifyMic1: 'id1', verifyMic2: 'id2', verifyDrawingRev: 'drawingRev',
  verifyActualThickness: 'actualThickness', verifyRevisedJointDesign: 'revisedJointDesign',
};

/* Records Review checkbox -> the Joint Details value it verifies */
const REVIEW_VERIFY_MAP: Record<string, keyof Job> = {
  verifyDrawing: 'drawing', verifyDrawingRev: 'drawingRev',
  verifyJoint: 'joint', verifyJointDesign: 'jointDesign',
  verifyWeldType: 'weldType', verifyPipeSize: 'pipeSize',
  verifyWallThickness: 'wallThickness', verifyMaterial1: 'materialType1',
  verifyMaterial2: 'materialType2', verifyMcl1: 'mcl1', verifyMcl2: 'mcl2',
  verifyNdt: 'ndt', verifyPwht: 'pwht', verifyNInd: 'nInd',
  verifyWps: 'wps', verifyOrder: 'order', verifyWorkPackage: 'workPackage',
};

export function fitupVerifyValue(fieldKey: string, job: Job | undefined, fab: Record<string, string>): string {
  const fabKey = FAB_VERIFY_MAP[fieldKey];
  return fabKey ? fabricationDisplayValue(fabKey, job, fab) : '';
}

export function reviewVerifyValue(fieldKey: string, job: Job | undefined): string {
  const jobKey = REVIEW_VERIFY_MAP[fieldKey];
  if (!jobKey || !job) return '';
  return String(job[jobKey] ?? '');
}
