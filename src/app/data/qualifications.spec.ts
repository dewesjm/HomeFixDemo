import { QUALIFICATIONS, DEFAULT_TEST_USER_QUALS, qualCheck } from './qualifications';
import { procedures } from './procedures';
import { qualConditions } from './qual-conditions';
import { QualGroup, qualsIn, termMet } from './qual-requirements';

const all = (...items: string[]): QualGroup => ({ op: 'all', items });

describe('qualifications', () => {
  it('has 20 distinct WELD4 + two digit codes', () => {
    expect(new Set(QUALIFICATIONS).size).toBe(20);
    QUALIFICATIONS.forEach(q => expect(q).toMatch(/^WELD4\d\d$/));
  });

  it('Test User starts with some but not all quals', () => {
    expect(DEFAULT_TEST_USER_QUALS.length).toBeGreaterThan(0);
    expect(DEFAULT_TEST_USER_QUALS.length).toBeLessThan(QUALIFICATIONS.length);
  });

  it('seed WTN conditions use only known quals, and the default Test User passes some and fails some', () => {
    const wtn = qualConditions().filter(c => c.field === 'wtn');
    expect(wtn.length).toBeGreaterThan(0);
    wtn.forEach(c => qualsIn(c.require).forEach(q => expect(QUALIFICATIONS).toContain(q)));
    const fails = wtn.filter(c => !termMet(c.require, DEFAULT_TEST_USER_QUALS));
    expect(fails.length).toBeGreaterThan(0);
    expect(fails.length).toBeLessThan(wtn.length);
  });

  it('every seeded WTN has a seed condition', () => {
    const wtns = new Set(qualConditions().filter(c => c.field === 'wtn').map(c => c.value));
    procedures().filter(p => /^W-\d+-\d+$/.test(p.id)).forEach(p => expect(wtns).toContain(p.wtn));
  });

  it('reports pass with nothing required, pass, and missing quals', () => {
    expect(qualCheck([], [])).toEqual({ status: 'passed', message: 'Passed' });
    expect(qualCheck(['WELD412', 'WELD427', 'WELD403'], [all('WELD412', 'WELD427')]))
      .toEqual({ status: 'passed', message: 'Passed, qualifications WELD412, WELD427, active' });
    expect(qualCheck(['WELD412'], [all('WELD412', 'WELD498', 'WELD426')]))
      .toEqual({ status: 'failed', message: 'Failed, qualifications WELD498, WELD426 missing' });
  });

  it('combines several conditions, and an OR passes with either qual', () => {
    const cm: QualGroup = { op: 'any', items: ['CNTRLMTL1', 'CNTRLMTL2'] };
    expect(qualCheck([], [cm]))
      .toEqual({ status: 'failed', message: 'Failed, qualifications CNTRLMTL1 OR CNTRLMTL2 missing' });
    expect(qualCheck(['CNTRLMTL2'], [cm]))
      .toEqual({ status: 'passed', message: 'Passed, qualifications CNTRLMTL2, active' });
    expect(qualCheck(['WELD412'], [cm, all('WELD412')]))
      .toEqual({ status: 'failed', message: 'Failed, qualifications CNTRLMTL1 OR CNTRLMTL2 missing' });
    expect(qualCheck(['CNTRLMTL1', 'WELD412'], [cm, all('WELD412')]))
      .toEqual({ status: 'passed', message: 'Passed, qualifications CNTRLMTL1, WELD412, active' });
  });
});
