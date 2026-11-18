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
    const result = exportProcedures({ text: 'pipe', filters: { status: ['active'] }, sort: { by: 'gwp', order: 'desc' } });
    if (!result.ok) return fail(result.error);
    const bytes = Uint8Array.from(atob(result.data.base64), char => char.charCodeAt(0));
    expect(Array.from(bytes.subarray(0, 3))).toEqual([239, 187, 191]);
    const [header, ...rows] = new TextDecoder().decode(bytes).split('\r\n');
    expect(header).toContain('GWP,WTN');
    expect(rows.map(row => row.split(',')[0])).toEqual(['A-200', 'A-100']);
    expect(rows[0]).toContain('Pipe 350°C');
  });

  it('exports every status unless filtered, and searches the same columns as searchProcedures', () => {
    procedures.set([
      testProcedure('B-100', { status: 'active', title: 'One' }),
      testProcedure('B-200', { status: 'retired', title: 'Two', weldProcess: 'SMAW' }),
    ]);
    const gwps = (q: Parameters<typeof exportProcedures>[0]) => {
      const result = exportProcedures(q);
      if (!result.ok) throw new Error(result.error);
      const text = new TextDecoder().decode(Uint8Array.from(atob(result.data.base64), c => c.charCodeAt(0)));
      return text.split('\r\n').slice(1).map(row => row.split(',')[0]);
    };
    expect(gwps({})).toEqual(['B-100', 'B-200']);
    expect(gwps({ filters: { status: ['retired'] } })).toEqual(['B-200']);
    expect(gwps({ text: 'smaw' })).toEqual(['B-200']);
  });

  it('reports unsupported queries as service errors', () => {
    expect(exportProcedures({ filters: { unknown: 'x' } as never }).ok).toBeFalse();
    expect(exportProcedures({ sort: { by: 'unknown' as never } }).ok).toBeFalse();
    expect(exportProcedures({ page: 1, pageSize: 10 }).ok).toBeFalse();
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
