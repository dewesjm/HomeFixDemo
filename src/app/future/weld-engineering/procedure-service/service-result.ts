/* What every Weld Engineering service call answers: { ok: true, data } or { ok: false, error, title }
   with a message saying what's wrong. Calls never throw. */
export type ServiceResult<T> = { ok: true; data: T } | ServiceFailure;

export interface ServiceFailure {
  ok: false;
  error: string;
  title: string;
  /* the procedures to change first, when they are why it was refused ('GWP W-101 / WTN 05.5-1') */
  procedures?: string[];
}

export function fail(error: string, title = 'Not done', procedures?: string[]): ServiceFailure {
  return procedures?.length ? { ok: false, error, title, procedures } : { ok: false, error, title };
}
