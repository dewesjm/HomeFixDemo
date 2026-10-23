import { COMMENTS_FIELD, drawnByOwnForm, hasCommentsBox, panelDrawsQualCheck, signoffForm, withComments } from './signoff-forms';
import { getTemplates, updateStageTemplate } from './stage-templates';
import { snapshotInputs } from './stage-display';
import { buildStages } from './build-stages';
import { JOBS } from '../jobs';

const step = (id: string, signoffType = 'standard') => ({ id, signoffType });

describe('signoffForm', () => {
  it('picks each step family\'s form, NQC rows included', () => {
    expect(signoffForm(step('pre-fit'))).toBe('fit');
    expect(signoffForm(step('fit'))).toBe('fit');
    expect(signoffForm(step('fit', 'weld-buildup'))).toBe('weld');
    expect(signoffForm(step('nqc-fitup-insp'))).toBe('fitup-insp');
    expect(signoffForm(step('root-layer'))).toBe('weld');
    expect(signoffForm(step('nqc-final-ndt-utrt'))).toBe('ndt');
    expect(signoffForm(step('excavation-ndt-2'))).toBe('ndt');
    expect(signoffForm(step('review-o04'))).toBe('records-review');
    expect(signoffForm(step('engineering-hold-2'))).toBe('engineering-hold');
    expect(signoffForm(step('repair-2'))).toBe('generic');
    expect(signoffForm(step('fitup-release'))).toBe('generic');
    expect(signoffForm(step('custom-123'))).toBe('generic');
  });

  it('follows the Form set on Admin > Routing Settings', () => {
    updateStageTemplate('Welding', 'fitup-release', { form: 'ndt' });
    try {
      expect(getTemplates()['Welding'].find(t => t.id === 'fitup-release')?.form).toBe('ndt');
      expect(signoffForm(step('fitup-release'))).toBe('ndt');
    } finally {
      updateStageTemplate('Welding', 'fitup-release', { form: 'generic' });
    }
  });
});

describe('Qualification Check', () => {
  it('the panel draws it on inspection steps, whose definitions list it; the weld form draws its own', () => {
    for (const id of ['pre-fit', 'fitup-insp', 'nqc-fitup-insp', 'root-ndt-vt5x', 'nqc-final-ndt-utrt', 'excavation-ndt']) {
      expect(panelDrawsQualCheck(step(id))).withContext(id).toBeTrue();
    }
    for (const id of ['fit', 'tack', 'root-weld', 'repair', 'review-o63']) {
      expect(panelDrawsQualCheck(step(id))).withContext(id).toBeFalse();
    }
    expect(drawnByOwnForm('root-ndt-vt5x', 'qualificationCheck')).toBeTrue();
    expect(drawnByOwnForm('tack', 'qualificationCheck')).toBeFalse();
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
  it('insert, ring, Defer Tack and Release to welding only on their own steps; Affected Item and References everywhere', () => {
    expect(drawnByOwnForm(step('fit'), 'consumableInsertType')).toBeTrue();
    expect(drawnByOwnForm('fit-weld-buildup', 'consumableInsertType')).toBeTrue();
    expect(drawnByOwnForm(step('tack'), 'consumableInsertType')).toBeFalse();
    expect(drawnByOwnForm(step('pre-fit'), 'deferTack')).toBeFalse();
    expect(drawnByOwnForm(step('nqc-fitup-insp'), 'releaseToWelding')).toBeTrue();
    expect(drawnByOwnForm(step('root-ndt-vt5x'), 'releaseToWelding')).toBeFalse();
    expect(drawnByOwnForm(step('repair'), 'affectedItem')).toBeTrue();
    expect(drawnByOwnForm(step('fit'), 'references')).toBeTrue();
    expect(drawnByOwnForm(step('fit'), 'weldProcedure')).toBeFalse();
  });
});
