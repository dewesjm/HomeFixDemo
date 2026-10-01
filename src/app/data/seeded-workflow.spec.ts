import { seededWorkflow } from './workflow';
import { JOBS } from './jobs';

describe('seeded joints', () => {
  it('every seeded joint has at least one sign-off in its history', () => {
    const empty = JOBS.filter(j => !seededWorkflow(j).history.some(e => e.section === 'Sign-off')).map(j => j.id);
    expect(empty).toEqual([]);
  });
});
