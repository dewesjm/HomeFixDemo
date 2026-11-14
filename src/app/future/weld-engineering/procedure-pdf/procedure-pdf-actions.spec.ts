import { procedurePdfBase64 } from './procedure-pdf-actions';
import { testProcedure } from '../testing/procedure-test-state';

describe('Procedure PDF actions', () => {
  it('renders a real PDF document for the procedure, base64 encoded', async () => {
    const base64 = await procedurePdfBase64(testProcedure('PDF-1', { title: 'PDF test', extraFields: { phMin: '100' } }));
    expect(atob(base64).startsWith('%PDF')).toBeTrue();
  }, 20000);
});
