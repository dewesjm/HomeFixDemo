import { callText, readArgs, sent, startingInputs, type ServiceOperation } from './service-operation';

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
