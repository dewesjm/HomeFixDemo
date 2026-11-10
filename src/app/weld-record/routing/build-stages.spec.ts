import { buildStages } from './build-stages';
import { getTemplates, updateStageTemplate } from './routing-settings-rules';
import { stepOnJoint } from './routing-ids';
import { JOBS, Job } from '../../data/jobs';
import { STORAGE } from '../../data/storage-keys';

describe('NQC rows (Admin > Routing Settings)', () => {
  const job = (nInd: string): Job => ({ ...JOBS[0], nInd, ndtRoot: 'UT' });
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
    const t = (id: string) => getTemplates().find(s => s.id === id)!;
    expect(t('root-ndt-vt5x').label).toBe('Root NDT 5X/VT');
    expect(t('nqc-root-ndt-vt5x').label).toBe('NQC Root NDT 5X/VT');
    expect(t('nqc-root-ndt-vt5x').displayName).toBe('Root NDT 5X/VT');
  });

  it('a Display Name set in Routing Settings is what the joint shows', () => {
    updateStageTemplate('nqc-fitup-insp', { displayName: 'Fit-Up Inspection' });
    expect(stage(job('1'), 'nqc-fitup-insp')?.label).toBe('Fit-Up Inspection');
    updateStageTemplate('nqc-fitup-insp', { displayName: 'Fit-Up Insp' });
  });

  it('a built-in step id finds the joint\'s own row', () => {
    expect(stepOnJoint(buildStages(job('1')), 'root-ndt-utrt')?.id).toBe('nqc-root-ndt-utrt');
    expect(stepOnJoint(buildStages(job('3')), 'root-ndt-utrt')?.id).toBe('root-ndt-utrt');
  });
});

/* every NDT step's Type starts blank so the inspector has to pick what was performed, even when
   Joint Details allow only one method */
describe('NDT Type is never pre-filled', () => {
  const job = (over: Partial<Job>): Job =>
    ({ ...JOBS[0], nInd: '3', ndt: '', ndtRoot: '', ndtEach: 'MT', ndtFinal: '', ...over });

  it('a single-method NDT step offers only that method, with Type blank', () => {
    const stages = buildStages(job({}));
    const layer = stages.find(s => s.id === 'layer-ndt-mtpt')!;
    expect(layer.typeOptions?.map(o => o.value)).toEqual(['mt']);
    expect(layer.inspectionType).toBe('');
  });

  it('no NDT step starts with a Type', () => {
    for (const j of JOBS.slice(0, 60)) {
      for (const s of buildStages(j).filter(s => /-ndt-/.test(s.id))) {
        expect(s.inspectionType).withContext(`${j.id} ${s.id}`).toBe('');
      }
    }
  });
});
