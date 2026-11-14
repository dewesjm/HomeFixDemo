import { callText, choiceGroups, readArgs, responseFile, sent, shownResponse, startingInputs, type ServiceOperation } from './service-operation';

const op: ServiceOperation = {
  name: 'demo', signature: 'demo()', description: '', writes: false, call: a => [a], fn: a => a,
  params: [
    { name: 'id', label: 'Id', type: 'text', required: true, example: 'A1' },
    { name: 'fields', label: 'Fields', type: 'list' },
    { name: 'filter', label: 'Filter', type: 'json' },
  ],
};

describe('service operation inputs', () => {
  it('starts each input on its example', () => {
    expect(startingInputs(op)).toEqual({ id: 'A1', fields: '', filter: '' });
  });

  it('reads text, comma lists and JSON, leaving blanks out', () => {
    expect(readArgs(op, { id: ' A1 ', fields: 'a, b,,', filter: '{"x": 1}' }))
      .toEqual({ args: { id: 'A1', fields: ['a', 'b'], filter: { x: 1 } } });
    expect(readArgs(op, { id: 'A1', fields: '  ' })).toEqual({ args: { id: 'A1' } });
  });

  it('names a missing required input or bad JSON', () => {
    expect(readArgs(op, {})).toEqual({ problem: 'Id is required.' });
    expect(readArgs(op, { id: 'A1', filter: '{x' })).toEqual({ problem: 'Filter isn\'t valid JSON.' });
  });

  it('writes the full call with each argument as JSON, dropping trailing ones left out', () => {
    expect(callText('demo', [{ gwp: 'W-1' }, 'note', undefined])).toBe('demo({\n  "gwp": "W-1"\n}, "note")');
    expect(callText('demo', [undefined, 'x'])).toBe('demo(undefined, "x")');
    expect(sent({ a: 1, b: undefined })).toEqual({ a: 1 });
  });
});

describe('service operation file responses', () => {
  const answer = { ok: true, data: { fileName: 'a.pdf', contentType: 'application/pdf', base64: 'x'.repeat(100) } };

  it('finds a file in the response', () => {
    expect(responseFile(answer)?.fileName).toBe('a.pdf');
    expect(responseFile({ ok: true, data: { count: 1 } })).toBeNull();
    expect(responseFile(null)).toBeNull();
  });

  it('shows a file\'s base64 cut short with its length', () => {
    const shown = shownResponse(answer) as typeof answer;
    expect(shown.data.base64).toBe(`${'x'.repeat(40)}... (100 characters)`);
    expect(answer.data.base64.length).toBe(100);
  });
});

describe('service operation picks and conditions', () => {
  const pickOp: ServiceOperation = {
    name: 'demo', signature: 'demo()', description: '', writes: false, call: a => [a], fn: a => a,
    params: [
      { name: 'fields', label: 'Fields', type: 'picks', example: 'a, b' },
      { name: 'filter', label: 'Filter', type: 'conditions', example: '{ "x": "1" }' },
    ],
  };

  it('starts picks and condition rows on their examples', () => {
    expect(startingInputs(pickOp)).toEqual({ fields: ['a', 'b'], filter: [{ key: 'x', value: '1' }] });
  });

  it('reads picks as a list and condition rows as an object, leaving empty ones out', () => {
    expect(readArgs(pickOp, { fields: ['a'], filter: [{ key: 'x', value: ' 1 ' }, { key: '', value: 'ignored' }] }))
      .toEqual({ args: { fields: ['a'], filter: { x: '1' } } });
    expect(readArgs(pickOp, { fields: [], filter: [] })).toEqual({ args: {} });
  });

  it('names a condition row without a value, or a field in two rows', () => {
    expect(readArgs(pickOp, { filter: [{ key: 'x', value: ' ' }] })).toEqual({ problem: 'Filter: enter a value for x.' });
    expect(readArgs(pickOp, { filter: [{ key: 'x', value: '1' }, { key: 'x', value: '2' }] }))
      .toEqual({ problem: 'Filter: x is in more than one row.' });
  });

  it('groups choices under their headings in order', () => {
    expect(choiceGroups([{ value: 'a', label: 'A', group: 'H' }, { value: 'b', label: 'B', group: 'H' }, { value: 'c', label: 'C', group: '1. S' }])
      .map(g => [g.group, g.choices.length])).toEqual([['H', 2], ['1. S', 1]]);
  });
});
