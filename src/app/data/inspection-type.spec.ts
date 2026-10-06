import { buildStages, excavationNdtStageFor } from './workflow';
import { JOBS, Job } from './jobs';

/* every NDT step's Type starts blank so the inspector has to pick what was performed, even when
   Joint Details allow only one method */
describe('NDT Type is never pre-filled', () => {
  const job = (over: Partial<Job>): Job =>
    ({ ...JOBS.find(j => j.trade === 'Welding')!, ndt: '', ndtRoot: '', ndtEach: 'MT', ndtFinal: '', ...over });

  it('a single-method NDT step offers only that method, with Type blank', () => {
    const stages = buildStages(job({}));
    const layer = stages.find(s => s.id === 'layer-ndt-mtpt')!;
    expect(layer.typeOptions?.map(o => o.value)).toEqual(['mt']);
    expect(layer.inspectionType).toBe('');
  });

  it('no NDT step starts with a Type', () => {
    for (const j of JOBS.filter(j => j.trade === 'Welding').slice(0, 60)) {
      for (const s of buildStages(j).filter(s => /-ndt-/.test(s.id))) {
        expect(s.inspectionType).withContext(`${j.id} ${s.id}`).toBe('');
      }
    }
  });

  it('Excavation NDT offers the method that rejected the joint, with Type blank', () => {
    const s = excavationNdtStageFor(job({}), 'rt', 'repair');
    expect(s.typeOptions?.map(o => o.value)).toEqual(['rt']);
    expect(s.inspectionType).toBe('');
  });
});
