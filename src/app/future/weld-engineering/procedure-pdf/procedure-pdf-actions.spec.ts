import { procedurePdfDataUrl } from './procedure-pdf-actions';
import { testProcedure } from '../testing/procedure-test-state';

describe('Procedure PDF actions', () => {
  it('renders a real PDF document for the procedure as a data URL', async () => {
    const url = await procedurePdfDataUrl(testProcedure('PDF-1', { title: 'PDF test', extraFields: { phMin: '100' } }));
    expect(url.startsWith('data:application/pdf;base64,')).toBeTrue();
    expect(atob(url.split(',')[1]).startsWith('%PDF')).toBeTrue();
  }, 20000);
});
