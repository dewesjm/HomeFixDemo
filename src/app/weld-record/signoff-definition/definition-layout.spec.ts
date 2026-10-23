import { layoutSections, withNewField } from './definition-layout';
import { DECISION_KEY, HEADING_KEY_PREFIX, getActivationForStep, numberLines } from './step-field-config';

const all = () => true;

describe('layoutSections', () => {
  it('puts fields with the same line number side by side, lines in number order', () => {
    const sections = layoutSections([{ key: 'c', line: 3 }, { key: 'a', line: 1 }, { key: 'b', line: 1 }], all);
    expect(sections).toEqual([{ box: false, title: '', parts: [{ kind: 'line', keys: ['a', 'b'] }, { kind: 'line', keys: ['c'] }] }]);
  });

  it('places headings by their line number too', () => {
    const sections = layoutSections([
      { key: 'a', line: 1 }, { key: 'b', line: 3 }, { key: HEADING_KEY_PREFIX + 'x', heading: 'Sub', line: 2 },
    ], all);
    expect(sections[0].parts).toEqual([{ kind: 'line', keys: ['a'] }, { kind: 'heading', text: 'Sub' }, { kind: 'line', keys: ['b'] }]);
  });

  it('keeps Inspection Results and verify rows on a line of their own whatever their number', () => {
    const sections = layoutSections([{ key: 'a', line: 1 }, { key: DECISION_KEY, line: 1 }, { key: 'b', line: 1 }], all);
    expect(sections[0].parts).toEqual([{ kind: 'line', keys: ['a'] }, { kind: 'line', keys: [DECISION_KEY] }, { kind: 'line', keys: ['b'] }]);
  });

  it('starts a box at a box heading and keeps plain headings inside it', () => {
    const sections = layoutSections([
      { key: 'a', line: 1 },
      { key: HEADING_KEY_PREFIX + 'x', heading: 'Box', newBox: true, line: 2 },
      { key: HEADING_KEY_PREFIX + 'y', heading: 'Sub', line: 3 },
      { key: 'b', line: 4 },
    ], all);
    expect(sections).toEqual([
      { box: false, title: '', parts: [{ kind: 'line', keys: ['a'] }] },
      { box: true, title: 'Box', parts: [{ kind: 'heading', text: 'Sub' }, { kind: 'line', keys: ['b'] }] },
    ]);
  });

  it('joins a field to the line before when the field between them on that line is hidden', () => {
    const sections = layoutSections([{ key: 'a', line: 1 }, { key: 'b', line: 1 }, { key: 'c', line: 1 }], k => k !== 'b');
    expect(sections[0].parts).toEqual([{ kind: 'line', keys: ['a', 'c'] }]);
  });

  it('leaves out headings and boxes with no shown field under them', () => {
    const sections = layoutSections(numberLines([
      { key: HEADING_KEY_PREFIX + 'x', heading: 'Empty box', newBox: true },
      { key: 'hidden' },
      { key: HEADING_KEY_PREFIX + 'y', heading: 'Box', newBox: true },
      { key: HEADING_KEY_PREFIX + 'z', heading: 'Nothing under me' },
      { key: HEADING_KEY_PREFIX + 'w', heading: 'Sub' },
      { key: 'b' },
    ]), k => k !== 'hidden');
    expect(sections).toEqual([{ box: true, title: 'Box', parts: [{ kind: 'heading', text: 'Sub' }, { kind: 'line', keys: ['b'] }] }]);
  });

  it('draws the default Root Weld with Type first, then five boxes (its 5X question, then Comments, last), the requirements on one line', () => {
    const sections = layoutSections(getActivationForStep('root').fields, all);
    expect(sections.map(s => s.title)).toEqual(['', '', 'Preheat/Interpass', '', '', '']);
    expect(sections[0].parts).toEqual([{ kind: 'line', keys: ['type'] }]);
    expect(sections[4].parts).toEqual([{ kind: 'line', keys: ['performed5x'] }]);
    expect(sections[5].parts).toEqual([{ kind: 'line', keys: ['comments'] }]);
    expect(sections[1].parts).toEqual([
      { kind: 'line', keys: ['weldProcedure', 'wtn', 'weldProcess'] }, { kind: 'line', keys: ['qualificationCheck'] },
      { kind: 'line', keys: ['consumableInsertOnly'] }, { kind: 'line', keys: ['fillerMetalType', 'fillerMetalSize', 'fillerMetalMic'] },
    ]);
    expect(sections[2].parts[1]).toEqual({ kind: 'line', keys: ['phMin', 'phMax', 'ipMin', 'ipMax'] });
  });

  it('draws the default UT/RT NDT with Type first and Inspection Results just above Defect Code, References and Comments', () => {
    const keys = layoutSections(getActivationForStep('rt').fields, all)
      .flatMap(s => s.parts.flatMap(p => p.kind === 'line' ? p.keys : []));
    expect(keys[0]).toBe('type');
    expect(keys.slice(keys.indexOf(DECISION_KEY))).toEqual([DECISION_KEY, 'defectCode', 'references', 'comments']);
  });
});

describe('numberLines', () => {
  it('numbers lines in order, an item marked to share a line taking the number before it', () => {
    expect(numberLines([{ key: 'a' }, { key: 'b', sameLine: true }, { key: 'c' }]).map(a => [a.key, a.line]))
      .toEqual([['a', 1], ['b', 1], ['c', 2]]);
  });

  it('keeps numbers already set', () => {
    expect(numberLines([{ key: 'a', line: 4 }, { key: 'b' }]).map(a => a.line)).toEqual([4, 5]);
  });
});

describe('withNewField', () => {
  it('puts a new field on a new line at the end', () => {
    expect(withNewField([{ key: 'a', line: 1 }, { key: 'b', line: 2 }], 'c')).toEqual([{ key: 'a', line: 1 }, { key: 'b', line: 2 }, { key: 'c', line: 3 }]);
  });

  it('takes the line of Inspection Results when that is last on its own line, moving it down one', () => {
    expect(withNewField([{ key: 'a', line: 1 }, { key: DECISION_KEY, line: 2 }], 'c'))
      .toEqual([{ key: 'a', line: 1 }, { key: 'c', line: 2 }, { key: DECISION_KEY, line: 3 }]);
  });
});
