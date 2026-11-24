import { JOBS } from '../../data/jobs';
import { STRUCTURAL_JOINTS } from '../../data/structural-joints';
import { findJointById, findJointByRoute, jointRoute } from './joint-route';

describe('joint-route', () => {
  it('builds a pipe link by default and a structural link when asked', () => {
    const k = { hull: 'H1', drawing: 'D1', joint: 'J1' };
    expect(jointRoute(k)).toEqual(['/jobs', 'H1', 'D1', 'J1']);
    expect(jointRoute(k, 'structural')).toEqual(['/structural', 'H1', 'D1', 'J1']);
  });

  it('looks a structural joint up in the structural joints only', () => {
    const s = STRUCTURAL_JOINTS[0];
    expect(findJointByRoute(s.hull, s.drawing, s.joint, 'structural')).toBe(s);
    const p = JOBS[0];
    expect(findJointByRoute(p.hull, p.drawing, p.joint, 'structural')).toBeUndefined();
    expect(findJointByRoute(p.hull, p.drawing, p.joint)).toBe(p);
  });

  it('finds a pipe or structural joint by id', () => {
    expect(findJointById(JOBS[0].id)).toBe(JOBS[0]);
    expect(findJointById(STRUCTURAL_JOINTS[0].id)).toBe(STRUCTURAL_JOINTS[0]);
    expect(findJointById('nope')).toBeUndefined();
  });
});
