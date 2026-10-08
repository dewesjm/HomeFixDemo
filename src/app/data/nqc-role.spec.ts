import { buildStages, updateStageTemplate } from './workflow';
import { JOBS, Job } from './jobs';
import { STORAGE } from './storage-keys';

describe('Persona when N Ind 1 or 2', () => {
  const job = (nInd: string): Job => ({ ...JOBS.find(j => j.trade === 'Welding')!, nInd });
  const roleOf = (j: Job, id: string) => buildStages(j).find(s => s.id === id)?.role;

  afterEach(() => localStorage.removeItem(STORAGE.stageTemplates));

  it('sends Fit-Up Insp and the NDT steps to NQC Inspector on N Ind 1 or 2', () => {
    for (const n of ['1', '2']) {
      expect(roleOf(job(n), 'fitup-insp')).toBe('NQC Inspector');
      expect(roleOf(job(n), 'layer-ndt-vt5x')).toBe('NQC Inspector');
    }
  });

  it('keeps Role on N Ind 3', () => {
    expect(roleOf(job('3'), 'fitup-insp')).toBe('Foreman|Inspector');
    expect(roleOf(job('3'), 'layer-ndt-vt5x')).toBe('Inspector');
  });

  it('follows the table: a blank setting signs with Role', () => {
    updateStageTemplate('Welding', 'fitup-insp', { nqcRole: '' });
    expect(roleOf(job('1'), 'fitup-insp')).toBe('Foreman|Inspector');
  });
});
