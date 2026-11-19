/* Admin → Groups change history: one entry per saved add, edit or delete of a group, with who made
   it and each change as a line of text. Entries keep the group's name and permission labels as they
   were, so they still read correctly after a rename or a deleted Signoff Type. The seeds are made-up
   history for the demo. */
import { STORAGE } from './storage-keys';

export type GroupChangeAction = 'Added' | 'Changed' | 'Deleted';

export interface GroupChange {
  id: string;
  when: string;        /* ISO date and time */
  who: string;
  groupId: string;
  group: string;       /* the group's name at the time */
  action: GroupChangeAction;
  changes: string[];
}

const entry = (when: string, who: string, groupId: string, group: string, action: GroupChangeAction, changes: string[]): GroupChange =>
  ({ id: `seed-${when}`, when, who, groupId, group, action, changes });

const SEED_HISTORY: GroupChange[] = [
  entry('2026-09-02T09:14:00', 'Alex', 'g9', 'Engineering', 'Added', [
    'Added persona Engineering', 'Granted Search records', 'Granted View Joint Details', 'Granted Joint History button',
    'Granted View History page', 'Granted Routing Override', 'Granted Release Engineering Hold', 'Granted Engineering Override',
  ]),
  entry('2026-10-06T13:40:00', 'Alex', 'g6', 'NQC Inspector', 'Changed', ['Granted Sign Pre-Fit']),
  entry('2026-11-04T07:52:00', 'Quinn', 'g5', 'Inspector', 'Changed', ['Removed Sign VT', 'Removed Sign 5X']),
  entry('2026-11-05T10:05:00', 'Alex', 'g5', 'Inspector', 'Changed', ['Granted Sign VT', 'Granted Sign 5X']),
  entry('2026-11-10T15:21:00', 'Quinn', 'temp-contractors', 'Temp Contractors', 'Added', [
    'Added persona Fitting', 'Granted Search records', 'Granted Sign Fit',
  ]),
  entry('2026-11-12T08:30:00', 'Alex', 'temp-contractors', 'Temp Contractors', 'Deleted', [
    'Had persona Fitting', 'Had Search records', 'Had Sign Fit',
  ]),
  entry('2026-11-14T11:02:00', 'Quinn', 'g4', 'Foreman', 'Changed', [
    'Description: "Foremen who handle fit-up." → "Foremen who handle fit-up and repair routings."',
  ]),
];

export function loadGroupHistory(): GroupChange[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.adminGroupHistory) ?? 'null');
    if (Array.isArray(saved)) return saved;
  } catch { /* use the seeds */ }
  return SEED_HISTORY;
}

export function saveGroupHistory(history: GroupChange[]) {
  localStorage.setItem(STORAGE.adminGroupHistory, JSON.stringify(history));
}
