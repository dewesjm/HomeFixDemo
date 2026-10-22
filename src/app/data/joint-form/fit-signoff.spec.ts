import { JOBS, Job } from '../jobs';
import { buildStages, WorkflowStage, setStepFieldConfig, resetStepFieldConfig, DEFAULT_STEP_FIELD_ACTIVATIONS, FieldActivation } from '../workflow';
import { STORAGE } from '../storage-keys';
import { jointDesignRequiresInsert, jointDesignRequiresBackingRing } from '../workflow';
import { visibleSignoffFields, requiredSignoffFields } from './fit-signoff';

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
    expect(keys(visibleSignoffFields(fitOf(plain), plain, {}))).toEqual(['deferTack']);
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

  it('follows the Fit definition: an unticked field is gone, Required and greyed-out apply', () => {
    const both = job({ jointDesign: 'C-65' });
    const fitFields = (fields: FieldActivation[]) =>
      DEFAULT_STEP_FIELD_ACTIVATIONS.map(a => a.stepId === 'fit' ? { ...a, fields } : a);
    try {
      setStepFieldConfig(fitFields([
        { key: 'consumableInsertType', required: false },
        { key: 'consumableInsertSize', disabledIf: { all: [{ source: 'jointDetail', key: 'titanium', equals: '' }] } },
        { key: 'deferTack' },
      ]));
      const shown = visibleSignoffFields(fitOf(both), both, {});
      expect(keys(shown)).toEqual(['consumableInsertType', 'consumableInsertSize', 'deferTack']);
      expect(keys(requiredSignoffFields(fitOf(both), both, {}))).toEqual(['consumableInsertSize']);
      expect(shown.find(f => f.key === 'consumableInsertSize')!.disabled).toBeTrue();
    } finally { resetStepFieldConfig(); }
  });

  it('reads a saved definition that kept sign-off fields in a separate list', () => {
    const both = job({ jointDesign: 'C-65' });
    try {
      localStorage.setItem(STORAGE.stepFieldConfig, JSON.stringify([{ stepId: 'fit', fields: [], signoffFields: [{ key: 'backingRingType' }] }]));
      resetCacheOnly();
      expect(keys(visibleSignoffFields(fitOf(both), both, {}))).toEqual(['backingRingType']);
    } finally { resetStepFieldConfig(); }
  });
});

/* drops the in-memory copy so the next read comes from localStorage */
function resetCacheOnly() {
  const saved = localStorage.getItem(STORAGE.stepFieldConfig);
  resetStepFieldConfig();
  if (saved) localStorage.setItem(STORAGE.stepFieldConfig, saved);
}
