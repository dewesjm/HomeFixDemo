import { JOBS, Job } from '../jobs';
import { buildStages, WorkflowStage } from '../workflow';
import { jointDesignRequiresInsert, jointDesignRequiresBackingRing, visibleSignoffFields, requiredSignoffFields } from './fit-signoff';

const job = (over: Partial<Job> = {}): Job => ({ ...JOBS.find(j => j.trade === 'Welding')!, mcl1: 'STD', mcl2: 'STD', jointDesign: 'C-24', ...over });
const fitOf = (j: Job): WorkflowStage => buildStages(j).find(s => s.id === 'fit')!;
const keys = (fields: { key: string }[]) => fields.map(f => f.key);

describe('joint-form fit-signoff', () => {
  it('reads the joint design, with Revised Joint Design taking priority', () => {
    expect(jointDesignRequiresInsert(job({ jointDesign: 'C-18' }), {})).toBeTrue();
    expect(jointDesignRequiresInsert(job({ jointDesign: 'C-18' }), { revisedJointDesign: 'c-31' })).toBeFalse();
    expect(jointDesignRequiresBackingRing(job(), { revisedJointDesign: 'c-31' })).toBeTrue();
    expect(jointDesignRequiresInsert(job({ jointDesign: '' }), {})).toBeFalse();
  });

  it('hides insert and backing ring fields the joint design does not call for', () => {
    const plain = job();
    expect(keys(visibleSignoffFields(fitOf(plain), plain, {}))).toEqual(['comments', 'deferTack']);
    const both = job({ jointDesign: 'C-65' });
    expect(keys(visibleSignoffFields(fitOf(both), both, {}))).toEqual(jasmine.arrayContaining(['consumableInsertType', 'backingRingId']));
  });

  it('requires the insert/backing ring MICs only when traceability applies', () => {
    const noMic = job({ jointDesign: 'C-65' });
    expect(keys(requiredSignoffFields(fitOf(noMic), noMic, {}))).toEqual(['consumableInsertType', 'consumableInsertSize', 'backingRingType']);
    const mic = job({ jointDesign: 'C-65', mcl2: 'MC-I' });
    expect(keys(requiredSignoffFields(fitOf(mic), mic, {})))
      .toEqual(['consumableInsertType', 'consumableInsertSize', 'consumableInsertId', 'backingRingType', 'backingRingId']);
    const plain = job();
    expect(requiredSignoffFields(fitOf(plain), plain, {})).toEqual([]);
  });
});
