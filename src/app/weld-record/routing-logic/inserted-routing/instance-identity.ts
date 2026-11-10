/* Runtime IDs carry a definition identity without depending on mutable names. */
export const insertionTarget = (definitionId: string) => `insert:${definitionId}`;
export const insertedDefinitionId = (id: string) => /^added:(.+):\d+$/.exec(id)?.[1];
export const insertionDefinitionId = (target: string) => target.startsWith('insert:') ? target.slice(7) : '';
