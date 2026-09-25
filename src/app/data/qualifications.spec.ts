import { QUALIFICATIONS, DEFAULT_TEST_USER_QUALS, qualCheck } from './qualifications';
import { procedures } from './procedures';

describe('qualifications', () => {
  it('has 20 distinct WELD4 + two digit codes', () => {
    expect(new Set(QUALIFICATIONS).size).toBe(20);
    QUALIFICATIONS.forEach(q => expect(q).toMatch(/^WELD4\d\d$/));
  });

  it('Test User starts with some but not all quals', () => {
    expect(DEFAULT_TEST_USER_QUALS.length).toBeGreaterThan(0);
    expect(DEFAULT_TEST_USER_QUALS.length).toBeLessThan(QUALIFICATIONS.length);
  });

  it('every seeded WPS requires only known quals', () => {
    procedures().forEach(p => p.qualificationsRequired.forEach(q => expect(QUALIFICATIONS).toContain(q)));
  });

  it('seed data has WPS rows the default Test User passes and fails', () => {
    const fails = procedures().filter(p => p.qualificationsRequired.some(q => !DEFAULT_TEST_USER_QUALS.includes(q)));
    expect(fails.length).toBeGreaterThan(0);
    expect(fails.length).toBeLessThan(procedures().length);
  });

  it('reports pass with nothing required, pass, and missing quals', () => {
    expect(qualCheck([], [])).toEqual({ status: 'passed', message: 'Passed' });
    expect(qualCheck(['WELD412', 'WELD427', 'WELD403'], [], ['WELD412', 'WELD427']))
      .toEqual({ status: 'passed', message: 'Passed, user has WELD412, WELD427' });
    expect(qualCheck(['WELD412'], [], ['WELD412', 'WELD498', 'WELD426']))
      .toEqual({ status: 'failed', message: 'Failed, qualifications WELD498, WELD426 missing' });
  });

  it('checks condition quals before a WPS is picked and on steps with no WPS', () => {
    expect(qualCheck([], ['CNTRLMTL1']))
      .toEqual({ status: 'failed', message: 'Failed, qualifications CNTRLMTL1 missing' });
    expect(qualCheck(['CNTRLMTL1'], ['CNTRLMTL1']))
      .toEqual({ status: 'passed', message: 'Passed, user has CNTRLMTL1' });
    expect(qualCheck(['WELD412'], ['CNTRLMTL1'], ['WELD412']))
      .toEqual({ status: 'failed', message: 'Failed, qualifications CNTRLMTL1 missing' });
  });
});
