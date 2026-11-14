import { procedures } from '../../../data/procedures';
import { procedureSections } from '../procedure-sections';
import { keepProcedureStores, testProcedure } from '../testing/procedure-test-state';
import { exportProcedures, getLoadTemplate } from './procedure-file-service';

describe('Weld Engineering file services', () => {
  keepProcedureStores();

  it('exports all matching rows in table sort order and preserves Unicode', () => {
    procedures.set([
      testProcedure('A-100', { status: 'active', title: 'Pipe 250°C' }),
      testProcedure('A-200', { status: 'active', title: 'Pipe 350°C' }),
      testProcedure('A-300', { status: 'draft', title: 'Pipe draft' }),
      testProcedure('A-400', { status: 'active', title: 'Plate' }),
    ]);
    const result = exportProcedures({ text: 'pipe', columns: { status: ['active'] }, sort: 'gwp', order: -1 });
    if (!result.ok) return fail(result.error);
    const bytes = Uint8Array.from(atob(result.data.base64), char => char.charCodeAt(0));
    expect(Array.from(bytes.subarray(0, 3))).toEqual([239, 187, 191]);
    const [header, ...rows] = new TextDecoder().decode(bytes).split('\r\n');
    expect(header).toContain('GWP,WTN');
    expect(rows.map(row => row.split(',')[0])).toEqual(['A-200', 'A-100']);
    expect(rows[0]).toContain('Pipe 350°C');
  });

  it('reports unsupported filters as service errors', () => {
    expect(exportProcedures({ columns: { weldProcess: 'GTAW' } }).ok).toBeFalse();
    expect(exportProcedures({ sort: 'unknown' }).ok).toBeFalse();
  });

  it('returns a header-only workbook with current section fields', async () => {
    const sections = procedureSections();
    procedureSections.set([...sections, {
      id: 'test-section', name: 'Test section',
      fields: [{ key: 'testColumn', label: 'Test Column', type: 'text', required: false, options: [] }],
    }]);
    const result = await getLoadTemplate();
    if (!result.ok) return fail(result.error);
    const XLSX = await import('xlsx');
    const book = XLSX.read(result.data.base64, { type: 'base64' });
    expect(book.SheetNames).toEqual(['Import Template']);
    const rows = XLSX.utils.sheet_to_json<string[]>(book.Sheets['Import Template'], { header: 1 });
    expect(rows.length).toBe(1);
    expect(rows[0].slice(0, 2)).toEqual(['gwp', 'wtn']);
    expect(rows[0]).toContain('testColumn');
  });
});
