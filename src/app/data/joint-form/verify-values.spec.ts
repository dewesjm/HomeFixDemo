import { JOBS, Job } from '../jobs';
import { fitupVerifyValue, reviewVerifyValue } from './verify-values';

const job: Job = JOBS.find(j => j.trade === 'Welding')!;

describe('joint-form verify-values', () => {
  it('shows the Fabrication value each Fit-Up Insp checkbox verifies', () => {
    const fab = { id1: 'M-100', drawingRev: 'C', revisedJointDesign: 'c-18' };
    expect(fitupVerifyValue('verifyMic1', job, fab)).toBe('M-100');
    expect(fitupVerifyValue('verifyDrawingRev', job, fab)).toBe('C');
    expect(fitupVerifyValue('verifyRevisedJointDesign', job, fab)).toBe('C-18');
    expect(fitupVerifyValue('verifyActualThickness', job, fab)).toBe('');
    expect(fitupVerifyValue('notAField', job, fab)).toBe('');
  });

  it('shows the Joint Details value each Records Review checkbox verifies', () => {
    expect(reviewVerifyValue('verifyDrawing', job)).toBe(job.drawing);
    expect(reviewVerifyValue('verifyMaterial2', job)).toBe(job.materialType2);
    expect(reviewVerifyValue('verifyDrawing', undefined)).toBe('');
    expect(reviewVerifyValue('comments', job)).toBe('');
  });
});
