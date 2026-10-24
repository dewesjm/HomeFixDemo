/* Draft placement is independent of the routing's actual sequence number. */
export function isDraftRouting(row: { id: string }): boolean {
  return row.id.includes(':new-');
}

export function nextRoutingNumber(rows: { sequence: number }[]): number {
  return Math.max(0, ...rows.map(row => row.sequence)) + 1;
}

export function pinDraftRoutings<T extends { id: string }>(rows: T[]): T[] {
  return [...rows.filter(isDraftRouting).reverse(), ...rows.filter(row => !isDraftRouting(row))];
}
