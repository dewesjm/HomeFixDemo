/* Joint Details URL: /jobs/<hull>/<drawing>/<joint>, the combination that uniquely identifies a joint
   (XREFID can be blank, so it is never part of the URL) */
import { JOBS, type Job } from '../../data/jobs';

type JointIdentity = Pick<Job, 'hull' | 'drawing' | 'joint'>;
const jointSegments = (job: JointIdentity) => [job.hull, job.drawing, job.joint];

export function jointRoute(job: JointIdentity): string[] {
  return ['/jobs', ...jointSegments(job)];
}

export function findJointByRoute(hull: string | null, drawing: string | null, joint: string | null): Job | undefined {
  return JOBS.find(j => j.hull === hull && j.drawing === drawing && j.joint === joint);
}

/* where the app is served; a real install would take this from its settings. The demo uses the site
   it's running on. */
export function appBaseUrl(): string {
  return typeof document === 'undefined' ? '/' : document.baseURI;
}

/* the full Joint Details link other systems are given (each part URL-encoded), so they never build it */
export function jointUrl(job: JointIdentity, base = appBaseUrl()): string {
  const path = ['jobs', ...jointSegments(job)].map(encodeURIComponent).join('/');
  return new URL(path, base).href;
}
