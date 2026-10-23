import { parseCsvRows } from './spreadsheet-import';

describe('parseCsvRows', () => {
  it('keys each row by the header line and drops quotes', () => {
    expect(parseCsvRows('"hull",joint\r\n101,"J-1"\n102,J-2')).toEqual([
      { hull: '101', joint: 'J-1' },
      { hull: '102', joint: 'J-2' },
    ]);
  });

  it('leaves blank cells out and skips blank lines', () => {
    expect(parseCsvRows('hull,joint,notes\n101,,x\n\n')).toEqual([{ hull: '101', notes: 'x' }]);
  });

  it('is empty without a data row', () => {
    expect(parseCsvRows('hull,joint')).toEqual([]);
  });
});
