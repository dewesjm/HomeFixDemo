import { WELDER_QUALS, DEFAULT_TEST_USER_QUALS, qualCheck } from './welder-quals';
import { procedures } from './procedures';

describe('welder quals', () => {
  it('has 20 distinct WELD4 + two digit codes', () => {
    expect(new Set(WELDER_QUALS).size).toBe(20);
    WELDER_QUALS.forEach(q => expect(q).toMatch(/^WELD4\d\d$/));
  });

  it('Test User starts with some but not all quals', () => {
    expect(DEFAULT_TEST_USER_QUALS.length).toBeGreaterThan(0);
    expect(DEFAULT_TEST_USER_QUALS.length).toBeLessThan(WELDER_QUALS.length);
  });

  it('every seeded WPS requires only known quals', () => {
    procedures().forEach(p => p.qualificationsRequired.forEach(q => expect(WELDER_QUALS).toContain(q)));
  });

  it('seed data has WPS rows the default Test User passes and fails', () => {
    const fails = procedures().filter(p => p.qualificationsRequired.some(q => !DEFAULT_TEST_USER_QUALS.includes(q)));
    expect(fails.length).toBeGreaterThan(0);
    expect(fails.length).toBeLessThan(procedures().length);
  });

  it('reports no WPS, pass, and missing quals', () => {
    expect(qualCheck(undefined, []).status).toBe('none');
    expect(qualCheck(['WELD412', 'WELD427'], ['WELD412', 'WELD427', 'WELD403']))
      .toEqual({ status: 'passed', message: 'Passed, user has WELD412, WELD427' });
    expect(qualCheck(['WELD412', 'WELD498', 'WELD426'], ['WELD412']))
      .toEqual({ status: 'failed', message: 'Failed. Input disabled, qualifications WELD498, WELD426 missing' });
  });
});
