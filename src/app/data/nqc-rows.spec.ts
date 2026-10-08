import { buildStages, getTemplates, stepOnJoint, updateStageTemplate } from './workflow';
import { JOBS, Job } from './jobs';
import { STORAGE } from './storage-keys';

describe('NQC rows (Admin > Routing Settings)', () => {
  const job = (nInd: string): Job => ({ ...JOBS.find(j => j.trade === 'Welding')!, nInd, ndtRoot: 'UT' });
  const stage = (j: Job, id: string) => buildStages(j).find(s => s.id === id);

  afterEach(() => localStorage.removeItem(STORAGE.stageTemplates));

  it('N Ind 1 or 2 gets the NQC rows, signed by NQC Inspector and shown under the same name', () => {
    for (const n of ['1', '2']) {
      expect(stage(job(n), 'fitup-insp')).toBeUndefined();
      expect(stage(job(n), 'nqc-fitup-insp')).toEqual(jasmine.objectContaining({ role: 'NQC Inspector', label: 'Fit-Up Insp' }));
      expect(stage(job(n), 'nqc-root-ndt-utrt')).toEqual(jasmine.objectContaining({ role: 'NQC Inspector', label: 'Root NDT RT/UT' }));
    }
  });

  it('any other N Ind gets the regular rows', () => {
    expect(stage(job('3'), 'nqc-fitup-insp')).toBeUndefined();
    expect(stage(job('3'), 'fitup-insp')?.role).toBe('Foreman|Inspector');
    expect(stage(job('3'), 'root-ndt-utrt')?.role).toBe('Inspector');
  });

  it('the Routing Settings names differ, so rules can tell them apart', () => {
    const t = (id: string) => getTemplates()['Welding'].find(s => s.id === id)!;
    expect(t('root-ndt-vt5x').label).toBe('Root NDT 5X/VT');
    expect(t('nqc-root-ndt-vt5x').label).toBe('NQC Root NDT 5X/VT');
    expect(t('nqc-root-ndt-vt5x').displayName).toBe('Root NDT 5X/VT');
  });

  it('a Display Name set in Routing Settings is what the joint shows', () => {
    updateStageTemplate('Welding', 'nqc-fitup-insp', { displayName: 'Fit-Up Inspection' });
    expect(stage(job('1'), 'nqc-fitup-insp')?.label).toBe('Fit-Up Inspection');
    updateStageTemplate('Welding', 'nqc-fitup-insp', { displayName: 'Fit-Up Insp' });
  });

  it('a built-in step id finds the joint\'s own row', () => {
    expect(stepOnJoint(buildStages(job('1')), 'root-ndt-utrt')?.id).toBe('nqc-root-ndt-utrt');
    expect(stepOnJoint(buildStages(job('3')), 'root-ndt-utrt')?.id).toBe('root-ndt-utrt');
  });
});
