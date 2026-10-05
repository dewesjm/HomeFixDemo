import { JOBS, Job } from '../jobs';
import { jointDetailsUt, jointDetailsVt } from './joint-details';

const job = (ndt: string): Job => ({ ...JOBS[0], ndt });

describe('joint-form joint-details', () => {
  it('reads UT and VT from the NDT requirement', () => {
    expect(jointDetailsUt(job('VT + UT'))).toBe('X');
    expect(jointDetailsUt(job('VT + RT'))).toBe('-');
    expect(jointDetailsVt(job('Visual only'))).toBe('X');
    expect(jointDetailsVt(job('VT + MT + 5X'))).toBe('5X');
    expect(jointDetailsVt(job('UT + RT'))).toBe('-');
    expect(jointDetailsVt(job(''))).toBe('-');
  });
});
