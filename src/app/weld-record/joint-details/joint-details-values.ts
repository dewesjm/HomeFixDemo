/* Joint Details values worked out from the job rather than shown as stored: UT and VT read the
   job's NDT requirement */
import { Job } from '../../data/jobs';

const ndtHas = (job: Job, method: string) => (job.ndt || '').toUpperCase().includes(method);

/* UT: X when the NDT requirement includes UT, otherwise - */
export function jointDetailsUt(job: Job): string {
  return ndtHas(job, 'UT') ? 'X' : '-';
}

/* VT: X when the NDT requirement includes VT or Visual, otherwise blank (5X alone doesn't count) */
export function jointDetailsVt(job: Job): string {
  return ndtHas(job, 'VT') || ndtHas(job, 'VISUAL') ? 'X' : '';
}
