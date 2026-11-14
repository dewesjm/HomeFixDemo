/* What a system's service operation looks like to the service tester (each system's Admin > Services):
   a name, what it does, whether it changes data, its parameters, how the typed-in inputs become the
   call's arguments, and the call itself. The tester builds the input form from the parameters, shows
   the full call, and runs fn(...call(inputs)), so the call shown is exactly the call run.
   readArgs() turns the typed-in text into named inputs; callText() writes the full call. */
export type ParamType = 'text' | 'list' | 'select' | 'json';

export interface OperationParam {
  name: string;
  label: string;
  /* text: one value; list: comma separated values; select: one of options; json: a JSON value */
  type: ParamType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  /* one short line under the input */
  help?: string;
  /* starting text in the input */
  example?: string;
}

export interface ServiceOperation {
  name: string;
  /* the call's shape, e.g. 'getProcedure({ gwp, wtn }, { fields?, status?, revision? })'; ? = optional */
  signature: string;
  description: string;
  /* true when running it changes the system's data */
  writes: boolean;
  params: OperationParam[];
  /* the named inputs as the call's arguments, in order */
  call(inputs: Record<string, unknown>): unknown[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn(...args: any[]): unknown;
}

/* blank inputs are left out */
export function readArgs(
  op: ServiceOperation, raw: Record<string, string>
): { args: Record<string, unknown> } | { problem: string } {
  const args: Record<string, unknown> = {};
  for (const p of op.params) {
    const text = (raw[p.name] ?? '').trim();
    if (!text) {
      if (p.required) return { problem: `${p.label} is required.` };
      continue;
    }
    if (p.type === 'list') args[p.name] = text.split(',').map(s => s.trim()).filter(Boolean);
    else if (p.type === 'json') {
      try { args[p.name] = JSON.parse(text); } catch { return { problem: `${p.label} isn't valid JSON.` }; }
    } else args[p.name] = text;
  }
  return { args };
}

/* an object without its undefined properties, so an optional value left blank isn't sent */
export function sent<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/* the call as code, each argument as JSON; trailing arguments left out are dropped */
export function callText(name: string, args: unknown[]): string {
  const list = [...args];
  while (list.length && list[list.length - 1] === undefined) list.pop();
  const parts = list.map(a => a === undefined ? 'undefined' : JSON.stringify(a, null, 2));
  return `${name}(${parts.join(', ')})`;
}

/* each parameter's starting text */
export function startingInputs(op: ServiceOperation): Record<string, string> {
  return Object.fromEntries(op.params.map(p => [p.name, p.example ?? '']));
}
