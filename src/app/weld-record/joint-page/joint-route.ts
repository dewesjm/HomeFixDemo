/* Joint Details URL: /jobs/<hull>/<drawing>/<joint>, the combination that uniquely identifies a joint
   (XREFID can be blank, so it is never part of the URL) */
import { JOBS, Job } from '../../data/jobs';

export function jointRoute(job: Pick<Job, 'hull' | 'drawing' | 'joint'>): string[] {
  return ['/jobs', job.hull, job.drawing, job.joint];
}

export function findJointByRoute(hull: string | null, drawing: string | null, joint: string | null): Job | undefined {
  return JOBS.find(j => j.hull === hull && j.drawing === drawing && j.joint === joint);
}
