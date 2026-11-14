/* What a system's service operation looks like to the service tester (each system's Admin > Services):
   a name, what it does, whether it changes data, its parameters, and how to run it. A system lists its
   operations; the tester builds the input form from the parameters and shows the response.
   readArgs() turns the typed-in text into the arguments run() gets. */
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
  /* the call as code, e.g. 'getProcedure({ gwp, wtn }, { fields, status, revision })' */
  signature: string;
  description: string;
  /* true when running it changes the system's data */
  writes: boolean;
  params: OperationParam[];
  run(args: Record<string, unknown>): unknown;
}

/* blank inputs are left out of the arguments */
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

/* each parameter's starting text */
export function startingInputs(op: ServiceOperation): Record<string, string> {
  return Object.fromEntries(op.params.map(p => [p.name, p.example ?? '']));
}
