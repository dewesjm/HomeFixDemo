import { COMMENTS_FIELD, drawnByOwnForm, hasCommentsBox, withComments } from './signoff-forms';
import { verifyAgainst } from './step-field-config';
import { definitionStageFields } from './shown-fields';
import { snapshotInputs } from './stage-display';
import { buildStages } from '../routing/build-stages';
import { JOBS } from '../../data/jobs';

const step = (id: string, signoffType = 'standard') => ({ id, signoffType });

describe('verifyAgainst', () => {
  it('Fit-Up Insp checks Fabrication values, Records Review the joint record', () => {
    expect(verifyAgainst(step('fitup-insp'))).toBe('fabrication');
    expect(verifyAgainst(step('nqc-fitup-insp'))).toBe('fabrication');
    expect(verifyAgainst(step('review-o63'))).toBe('record');
    expect(verifyAgainst(step('review-o04'))).toBe('record');
  });
});

describe('Qualification Check', () => {
  it('is an ordinary field of every step whose definition lists it', () => {
    for (const id of ['pre-fit', 'fitup-insp', 'nqc-fitup-insp', 'root-ndt-vt5x', 'nqc-final-ndt-utrt', 'excavation-ndt', 'tack']) {
      expect(drawnByOwnForm(step(id), 'qualificationCheck')).withContext(id).toBeFalse();
      expect(definitionStageFields(step(id)).some(f => f.key === 'qualificationCheck')).withContext(id).toBeTrue();
    }
  });
});

describe('Comments box', () => {
  it('every hand-signed step has one; Engineering Hold and Sold don\'t', () => {
    const ids = buildStages(JOBS[0]).map(s => s.id);
    for (const id of ids.filter(i => i !== 'sold')) expect(hasCommentsBox(step(id))).withContext(id).toBeTrue();
    expect(hasCommentsBox(step('sold'))).toBeFalse();
    expect(hasCommentsBox(step('engineering-hold'))).toBeFalse();
  });

  it('no step lists Comments itself, so it is added exactly once', () => {
    for (const s of buildStages(JOBS[0])) {
      expect([...s.fields, ...s.signoffFields].some(f => f.key === 'comments')).withContext(s.id).toBeFalse();
      expect(withComments(s, withComments(s, s.signoffFields)).filter(f => f === COMMENTS_FIELD).length)
        .withContext(s.id).toBe(s.id === 'sold' ? 0 : 1);
    }
  });

  it('History records the comment with the sign-off', () => {
    const stage = { ...buildStages(JOBS[0]).find(s => s.id === 'fitup-insp' || s.id === 'nqc-fitup-insp')! };
    stage.signoffInputs = { comments: 'gap checked twice' };
    expect(snapshotInputs(stage, [], stage.signoffFields)).toContain({ label: 'Comments', value: 'gap checked twice' });
  });
});

describe('drawnByOwnForm', () => {
  it('insert, ring and Defer Tack only on their own steps; Affected Item, References and Signoff History everywhere', () => {
    expect(drawnByOwnForm(step('fit'), 'consumableInsertType')).toBeTrue();
    expect(drawnByOwnForm('fit-weld-buildup', 'consumableInsertType')).toBeTrue();
    expect(drawnByOwnForm(step('tack'), 'consumableInsertType')).toBeFalse();
    expect(drawnByOwnForm(step('pre-fit'), 'deferTack')).toBeFalse();
    expect(drawnByOwnForm(step('nqc-fitup-insp'), 'releaseToWelding')).toBeFalse();
    expect(drawnByOwnForm(step('review-o63'), 'signoffHistory')).toBeTrue();
    expect(drawnByOwnForm(step('repair'), 'affectedItem')).toBeTrue();
    expect(drawnByOwnForm(step('fit'), 'references')).toBeTrue();
    expect(drawnByOwnForm(step('fit'), 'weldProcedure')).toBeFalse();
  });
});
