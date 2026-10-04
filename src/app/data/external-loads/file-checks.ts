/* Checks a load must pass before its tables go live. A failed check leaves the previous load live. */
import { ConvertedRow } from './convert';

export interface FileCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export const MAX_CONVERSION_ERROR_RATE = 0.1;

export function fileChecks(trailerCount: number, linesReceived: number, converted: ConvertedRow[]): FileCheck[] {
  const bad = converted.filter(r => r.errors.length).length;
  const rate = converted.length ? bad / converted.length : 0;
  return [
    {
      name: 'Complete file',
      passed: trailerCount === linesReceived,
      detail: `Trailer says ${trailerCount} lines, ${linesReceived} received`,
    },
    {
      name: `Conversion errors under ${MAX_CONVERSION_ERROR_RATE * 100}%`,
      passed: rate < MAX_CONVERSION_ERROR_RATE,
      detail: `${bad} of ${converted.length} lines (${(rate * 100).toFixed(1)}%)`,
    },
  ];
}
