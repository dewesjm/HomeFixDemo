import { COMMENTS_FIELD, drawnByOwnForm, hasCommentsBox, withComments } from './signoff-parts';
import { verifyAgainst } from './step-field-config';
import { definitionStageFields } from './shown-fields';
import { snapshotInputs } from './stage-display';
import { buildStages } from '../routing/build-stages';
import { JOBS } from '../../data/jobs';
import { signoffTypeOptions } from './signoff-types';

/* a step on its default Type, or the one given */
const step = (id: string, signoffType = signoffTypeOptions(id)?.find(o => o.default)?.value ?? 'standard') => ({ id, signoffType });
/* a built step on a Type: its own, else its first option (an NDT step starts with none picked) */
const onType = <T extends { signoffType: string; typeOptions?: { value: string }[] }>(s: T): T =>
  s.typeOptions?.some(o => o.value === s.signoffType) ? s : { ...s, signoffType: s.typeOptions?.[0]?.value ?? s.signoffType };

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
    for (const s of [step('pre-fit'), step('fitup-insp'), step('nqc-fitup-insp'), step('root-ndt-vt5x', 'vt'), step('nqc-final-ndt-utrt', 'rt'), step('excavation-ndt', 'mt'), step('tack')]) {
      expect(drawnByOwnForm(s, 'qualificationCheck')).withContext(s.id).toBeFalse();
      expect(definitionStageFields(s).some(f => f.key === 'qualificationCheck')).withContext(s.id).toBeTrue();
    }
  });
});

describe('Comments box', () => {
  it('every hand-signed step has one once its Type is picked; Engineering Hold and Sold don\'t', () => {
    for (const s of buildStages(JOBS[0]).filter(x => x.id !== 'sold').map(onType)) expect(hasCommentsBox(s)).withContext(s.id).toBeTrue();
    expect(hasCommentsBox({ id: 'root-ndt-vt5x', signoffType: 'standard' })).toBeFalse();
    expect(hasCommentsBox(step('sold'))).toBeFalse();
    expect(hasCommentsBox(step('engineering-hold'))).toBeFalse();
  });

  it('no step lists Comments itself, so it is added exactly once', () => {
    for (const s of buildStages(JOBS[0]).map(onType)) {
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
    expect(drawnByOwnForm('weld-buildup', 'consumableInsertType')).toBeTrue();
    expect(drawnByOwnForm(step('tack'), 'consumableInsertType')).toBeFalse();
    expect(drawnByOwnForm(step('pre-fit'), 'deferTack')).toBeFalse();
    expect(drawnByOwnForm(step('nqc-fitup-insp'), 'releaseToWelding')).toBeFalse();
    expect(drawnByOwnForm(step('review-o63'), 'signoffHistory')).toBeTrue();
    expect(drawnByOwnForm(step('repair'), 'affectedItem')).toBeTrue();
    expect(drawnByOwnForm(step('fit'), 'references')).toBeTrue();
    expect(drawnByOwnForm(step('fit'), 'weldProcedure')).toBeFalse();
  });
});
