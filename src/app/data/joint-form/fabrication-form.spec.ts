import { JOBS, Job } from '../jobs';
import { FABRICATION_FIELDS } from '../workflow';
import {
  micApplies, fabricationFieldsShown, fabricationDisplayValue, fabricationErrors, fabricationFieldRequired, missingFitFabrication,
} from './fabrication-form';

const job = (over: Partial<Job> = {}): Job => ({ ...JOBS.find(j => j.trade === 'Welding')!, mcl1: 'STD', mcl2: 'STD', ...over });

describe('joint-form fabrication-form', () => {
  it('MIC 1 / MIC 2 apply only when that member\'s MCL requires traceability', () => {
    const j = job({ mcl1: 'MC-I' });
    expect(micApplies(j, 'id1')).toBeTrue();
    expect(micApplies(j, 'id2')).toBeFalse();
    expect(micApplies(undefined, 'id1')).toBeFalse();
  });

  it('shows MIC fields and Ship Location fields only when they apply', () => {
    const keys = (j: Job, fab: Record<string, string>) => fabricationFieldsShown(j, fab).map(f => f.key);
    expect(keys(job(), {})).not.toContain('id1');
    expect(keys(job({ mcl2: 'MC-I' }), {})).toContain('id2');
    expect(keys(job(), {})).not.toContain('deck');
    expect(keys(job(), { location: 'ship' })).toContain('deck');
  });

  it('shows ER/IR Number only when Revised Joint Design is set', () => {
    const keys = (fab: Record<string, string>) => fabricationFieldsShown(job(), fab).map(f => f.key);
    expect(keys({})).not.toContain('changeNumber');
    expect(keys({ revisedJointDesign: 'c-18' })).toContain('changeNumber');
  });

  it('fills Location options from the shop list and resolves its label for display', () => {
    const location = fabricationFieldsShown(job(), {}).find(f => f.key === 'location')!;
    expect(location.options!.some(o => o.label === 'South Bay Welding' && o.value === 'south-bay-welding')).toBeTrue();
    expect(fabricationDisplayValue('location', job(), { location: 'south-bay-welding' })).toBe('South Bay Welding');
    expect(fabricationDisplayValue('actualThickness', job(), { actualThickness: '0.25' })).toBe('0.25');
    expect(fabricationDisplayValue('location', job(), {})).toBe('');
  });

  it('flags blank required values, skipping MICs that do not apply', () => {
    const errors = fabricationErrors(job(), {});
    expect(errors['location']).toBe('Location is required');
    expect(errors['drawingRev']).toBeDefined();
    expect(errors['id1']).toBeUndefined();
    expect(fabricationErrors(job({ mcl1: 'MC-I' }), {})['id1']).toBe('MIC 1 is required');
  });

  it('requires Ship Location fields only when Location is Shipboard, and ER/IR Number when Revised Joint Design is set', () => {
    expect(fabricationErrors(job(), { location: 'south-bay-welding' })['deck']).toBeUndefined();
    expect(fabricationErrors(job(), { location: 'ship' })['deck']).toBe('Deck is required');
    expect(fabricationErrors(job(), { revisedJointDesign: 'c-18' })['changeNumber']).toBe('ER/IR Number is required');
    expect(fabricationErrors(job(), {})['changeNumber']).toBeUndefined();
    const changeNumber = FABRICATION_FIELDS.find(f => f.key === 'changeNumber')!;
    expect(fabricationFieldRequired(changeNumber, {})).toBeFalse();
    expect(fabricationFieldRequired(changeNumber, { revisedJointDesign: 'c-18' })).toBeTrue();
  });

  it('lists the Fit-required fabrication values still blank', () => {
    expect(missingFitFabrication(job(), {})).toEqual(['Location', 'Drawing Rev', 'Actual Thickness']);
    expect(missingFitFabrication(job({ mcl1: 'MC-I', mcl2: 'MC-I' }), { location: 'ship', drawingRev: 'A' }))
      .toEqual(['MIC 1', 'MIC 2', 'Actual Thickness']);
    expect(missingFitFabrication(job(), { location: 'ship', drawingRev: 'A', actualThickness: ' 0.2 ' })).toEqual([]);
  });
});
