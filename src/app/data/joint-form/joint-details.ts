/* Joint Details values worked out from the job rather than shown as stored: UT and VT read the
   job's NDT requirement */
import { Job } from '../jobs';

const ndtHas = (job: Job, method: string) => (job.ndt || '').toUpperCase().includes(method);

/* UT: X when the NDT requirement includes UT, otherwise - */
export function jointDetailsUt(job: Job): string {
  return ndtHas(job, 'UT') ? 'X' : '-';
}

/* VT: 5X when the NDT requirement includes 5X, X for VT or Visual, otherwise - */
export function jointDetailsVt(job: Job): string {
  if (ndtHas(job, '5X')) return '5X';
  return ndtHas(job, 'VT') || ndtHas(job, 'VISUAL') ? 'X' : '-';
}
