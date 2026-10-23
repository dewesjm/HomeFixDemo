import { JOBS, Job } from '../../../data/jobs';
import { buildStages } from '../../routing/build-stages';
import { WorkflowStage } from '../../model/workflow-types';
import {
  setStepFieldConfig,
  resetStepFieldConfig,
  DEFAULT_TYPE_DEFINITIONS,
  FieldActivation,
} from '../../signoff-definition/step-field-config';
import { jointDesignRequiresInsert, jointDesignRequiresBackingRing } from '../../signoff-definition/joint-facts';
import { requiredSignoffFields } from './fit-signoff';
import { visibleSignoffFields } from '../../signoff-definition/shown-fields';

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
      DEFAULT_TYPE_DEFINITIONS.map(a => a.typeId === 'fit' ? { ...a, fields } : a);
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
});
