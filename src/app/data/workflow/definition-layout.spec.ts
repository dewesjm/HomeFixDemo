import { layoutSections } from './definition-layout';
import { DECISION_KEY, HEADING_KEY_PREFIX, getActivationForStep } from './step-field-config';
import { drawnOutsideForm } from './signoff-forms';

const all = () => true;
/* the form never draws Type, Comments or References itself */
const inForm = (key: string) => !drawnOutsideForm(key);

describe('layoutSections', () => {
  it('puts each field on its own line unless it is set to the same line', () => {
    const sections = layoutSections([{ key: 'a' }, { key: 'b', sameLine: true }, { key: 'c' }], all);
    expect(sections).toEqual([{ box: false, title: '', parts: [{ kind: 'line', keys: ['a', 'b'] }, { kind: 'line', keys: ['c'] }] }]);
  });

  it('starts a box at a box heading and keeps plain headings inside it', () => {
    const sections = layoutSections([
      { key: 'a' },
      { key: HEADING_KEY_PREFIX + 'x', heading: 'Box', newBox: true },
      { key: HEADING_KEY_PREFIX + 'y', heading: 'Sub' },
      { key: 'b' },
    ], all);
    expect(sections).toEqual([
      { box: false, title: '', parts: [{ kind: 'line', keys: ['a'] }] },
      { box: true, title: 'Box', parts: [{ kind: 'heading', text: 'Sub' }, { kind: 'line', keys: ['b'] }] },
    ]);
  });

  it('joins a same-line field to the line before when the field before it is hidden', () => {
    const sections = layoutSections([{ key: 'a' }, { key: 'b', sameLine: true }, { key: 'c', sameLine: true }], k => k !== 'b');
    expect(sections[0].parts).toEqual([{ kind: 'line', keys: ['a', 'c'] }]);
  });

  it('leaves out headings and boxes with no shown field under them', () => {
    const sections = layoutSections([
      { key: HEADING_KEY_PREFIX + 'x', heading: 'Empty box', newBox: true },
      { key: 'hidden' },
      { key: HEADING_KEY_PREFIX + 'y', heading: 'Box', newBox: true },
      { key: HEADING_KEY_PREFIX + 'z', heading: 'Nothing under me' },
      { key: HEADING_KEY_PREFIX + 'w', heading: 'Sub' },
      { key: 'b' },
    ], k => k !== 'hidden');
    expect(sections).toEqual([{ box: true, title: 'Box', parts: [{ kind: 'heading', text: 'Sub' }, { kind: 'line', keys: ['b'] }] }]);
  });

  it('draws the default Root Weld as the weld form does: four boxes (the last its 5X question), the requirements on one line', () => {
    const sections = layoutSections(getActivationForStep('root-weld').fields, inForm);
    expect(sections.map(s => s.title)).toEqual(['', 'Preheat/Interpass', '', '']);
    expect(sections[3].parts).toEqual([{ kind: 'line', keys: ['performed5x'] }]);
    expect(sections[0].parts).toEqual([
      { kind: 'line', keys: ['weldProcedure', 'wtn', 'weldProcess'] }, { kind: 'line', keys: ['qualificationCheck'] },
      { kind: 'line', keys: ['consumableInsertOnly'] }, { kind: 'line', keys: ['fillerMetalType', 'fillerMetalSize', 'fillerMetalMic'] },
    ]);
    expect(sections[1].parts[1]).toEqual({ kind: 'line', keys: ['phMin', 'phMax', 'ipMin', 'ipMax'] });
  });

  it('draws the default UT/RT NDT with Inspection Results just above Defect Code', () => {
    const keys = layoutSections(getActivationForStep('root-ndt-utrt').fields, inForm)
      .flatMap(s => s.parts.flatMap(p => p.kind === 'line' ? p.keys : []));
    expect(keys.slice(keys.indexOf(DECISION_KEY))).toEqual([DECISION_KEY, 'defectCode']);
  });
});
