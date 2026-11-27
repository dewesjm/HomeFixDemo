/* Joint Details URLs: /jobs/<hull>/<drawing>/<joint> for pipe joints, /structural/<hull>/<drawing>/<joint>
   for structural joints. Hull + drawing + joint uniquely identifies a joint within its type (XREFID can
   be blank, so it is never part of the URL); the type is in the link because a structural joint can
   share hull + drawing + joint with a pipe joint. */
import { JOBS, type Job, type JointType } from '../../data/jobs';
import { STRUCTURAL_JOINTS } from '../../data/structural-joints';

export type DetailsJointType = JointType;

type JointIdentity = Pick<Job, 'hull' | 'drawing' | 'joint'>;
const jointSegments = (job: JointIdentity) => [job.hull, job.drawing, job.joint];

const ROUTE_PREFIX: Record<DetailsJointType, string> = { pipe: 'jobs', structural: 'structural' };
const JOINTS: Record<DetailsJointType, () => Job[]> = { pipe: () => JOBS, structural: () => STRUCTURAL_JOINTS };

/* the search page each type's Joint Details returns to */
export const SEARCH_PAGE: Record<DetailsJointType, string> = { pipe: '/pipe-welding', structural: '/structural-welding' };

export function jointRoute(job: JointIdentity, type: DetailsJointType = 'pipe'): string[] {
  return ['/' + ROUTE_PREFIX[type], ...jointSegments(job)];
}

export function findJointByRoute(hull: string | null, drawing: string | null, joint: string | null, type: DetailsJointType = 'pipe'): Job | undefined {
  return JOINTS[type]().find(j => j.hull === hull && j.drawing === drawing && j.joint === joint);
}

/* a joint by its type and internal id */
export function findJointById(type: JointType, id: string): Job | undefined {
  return JOINTS[type]().find(j => j.id === id);
}

/* a joint of any type by its internal id (ids are unique across pipe and structural) */
export function findJointByAnyId(id: string): Job | undefined {
  return JOBS.find(j => j.id === id) ?? STRUCTURAL_JOINTS.find(j => j.id === id);
}

/* where the app is served; a real install would take this from its settings. The demo uses the site
   it's running on. */
export function appBaseUrl(): string {
  return typeof document === 'undefined' ? '/' : document.baseURI;
}

/* the full pipe Joint Details link other systems are given (each part URL-encoded), so they never build it */
export function jointUrl(job: JointIdentity, base = appBaseUrl()): string {
  const path = ['jobs', ...jointSegments(job)].map(encodeURIComponent).join('/');
  return new URL(path, base).href;
}
