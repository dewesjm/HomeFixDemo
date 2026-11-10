import { WorkflowStage } from '../model/workflow-types';
import { checksFabrication, goesBackPastFabrication } from './fabrication-steps';

const st = (id: string) => ({ id }) as WorkflowStage;

describe('Fabrication steps', () => {
  it('Fit and Fit-Up Insp (either row) check the Fabrication panel', () => {
    expect(checksFabrication('fit')).toBeTrue();
    expect(checksFabrication('fitup-insp')).toBeTrue();
    expect(checksFabrication('nqc-fitup-insp')).toBeTrue();
    expect(checksFabrication('tack')).toBeFalse();
  });

  it('going back to Fit or earlier blanks Fabrication', () => {
    const stages = ['pre-fit', 'fit', 'tack'].map(st);
    expect(goesBackPastFabrication(stages, 0)).toBeTrue();
    expect(goesBackPastFabrication(stages, 1)).toBeTrue();
    expect(goesBackPastFabrication(stages, 2)).toBeFalse();
    expect(goesBackPastFabrication([st('tack')], 0)).toBeFalse();
  });
});
