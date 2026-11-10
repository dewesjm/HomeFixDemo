/* Admin > Weld Positions row check: a code and a description, and the code not already used. */
interface PositionEntry { code: string; description: string }

export function validWeldPosition(entry: PositionEntry, others: PositionEntry[]): boolean {
  return !!entry.code.trim() && !!entry.description.trim() && !others.some(other =>
    other.code.trim().toUpperCase() === entry.code.trim().toUpperCase());
}
