import { HistoryEntry, JobWorkflow } from './types';
import { historyRows } from './history-rows';

const entry = (when: string, section: HistoryEntry['section'], fab?: Record<string, string>): HistoryEntry => ({
  when, who: 'A. Tester', section, action: `${section} ${when}`, routing: 'Fit',
  fabInputs: fab && Object.entries(fab).map(([label, value]) => ({ label, value })),
});

const rowsFor = (history: HistoryEntry[]) =>
  historyRows({ jobId: 'J1', history } as JobWorkflow, undefined).sort((a, b) => a.when.localeCompare(b.when));

describe('historyRows fabrication changes', () => {
  it('lists the filled fields on the first sign-off and only changed fields after that', () => {
    const rows = rowsFor([
      entry('2026-01-01', 'Sign-off', { 'W.E. Memo': 'M-1', 'Drawing Rev (Execution)': '' }),
      entry('2026-01-02', 'Sign-off', { 'W.E. Memo': 'M-1', 'Drawing Rev (Execution)': '' }),
      entry('2026-01-03', 'Sign-off', { 'W.E. Memo': 'M-2', 'Drawing Rev (Execution)': 'C' }),
    ]);
    expect(rows[0].fabChanges).toEqual([{ label: 'W.E. Memo', from: '', to: 'M-1' }]);
    expect(rows[1].fabChanges).toBeUndefined();
    expect(rows[2].fabChanges).toEqual([
      { label: 'Drawing Rev (Execution)', from: '', to: 'C' },
      { label: 'W.E. Memo', from: 'M-1', to: 'M-2' },
    ]);
  });

  it('compares from blank again after a Refit', () => {
    const rows = rowsFor([
      entry('2026-01-01', 'Sign-off', { 'W.E. Memo': 'M-1' }),
      entry('2026-01-02', 'Refit', { 'W.E. Memo': 'M-1' }),
      entry('2026-01-03', 'Sign-off', { 'W.E. Memo': 'M-1' }),
    ]);
    expect(rows[2].fabChanges).toEqual([{ label: 'W.E. Memo', from: '', to: 'M-1' }]);
  });
});
