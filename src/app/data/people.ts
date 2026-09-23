/* Mock people directory. In the real system this is a live lookup against an external system, not a list in the bundle. */
export interface Person {
  id: string;      /* employee identifier, unused by the UI for now */
  first: string;
  last: string;
  title: string;   /* current title; history entries keep the title held at the time */
}

const p = (id: string, first: string, last: string, title: string): Person => ({ id, first, last, title });

export const PEOPLE: Person[] = [
  /* technicians (job assignees) */
  p('E10231', 'Mike', 'Rourke', 'Welder'),
  p('E10232', 'Sara', 'Lindqvist', 'Welder'),
  p('E10233', 'Tom', 'Baxter', 'Fitter'),
  p('E10234', 'Dave', 'Kowalski', 'Welder'),
  p('E10235', 'Priya', 'Nair', 'Fitter'),
  p('E10236', 'Luis', 'Gomez', 'Welder'),
  p('E10237', 'Emma', 'Whitfield', 'Fitter'),
  /* inspectors and records */
  p('E20411', 'James', 'Carter', 'Inspector'),
  p('E20412', 'Minh', 'Nguyen', 'NQC Inspector'),
  p('E20413', 'Raj', 'Patel', 'Inspector'),
  p('E20414', 'Samantha', 'Williams', 'NQC Inspector'),
  p('E20415', 'Tina', 'Garcia', 'Inspector'),
  p('E20416', 'Amar', 'Singh', 'Inspector'),
  p('E20417', 'Kate', 'Brown', 'O63 Records Specialist'),
  p('E20418', 'Lily', 'Chen', 'NQC Inspector'),
  /* supervisors and others, with repeated names so search has to disambiguate */
  p('E30501', 'John', 'Johnson', 'Foreman'),
  p('E30502', 'Robert', 'Johnson', 'Welder'),
  p('E30503', 'Mike', 'Roberts', 'Fitter'),
  p('E30504', 'Sara', 'Lee', 'Inspector'),
  p('E30505', 'David', 'Kim', 'Foreman'),
  p('E30506', 'Maria', 'Santos', 'O04 Records Specialist'),
  p('E30507', 'Tom', 'Brown', 'Welder'),
  p('E30508', 'Anna', 'Petrov', 'Fitter'),
  p('E30509', 'Chris', 'Okafor', 'NQC Inspector'),
  p('E30510', 'Dana', 'Whitfield', 'Foreman'),
];

export const fullName = (x: Person) => `${x.first} ${x.last}`;

export const TECHNICIAN_NAMES = PEOPLE.slice(0, 7).map(fullName);
export const SEEDED_INSPECTOR_NAMES = PEOPLE.slice(7, 15).map(fullName);

const nameIndex = new Map(PEOPLE.map(x => [fullName(x), x]));
export const personByName = (name: string): Person | undefined => nameIndex.get(name);

/* who + the title they held now; stamped on every history entry so later title changes don't rewrite the past */
export function stampWho(name: string): { whoId?: string; whoTitle?: string } {
  const x = personByName(name);
  return x ? { whoId: x.id, whoTitle: x.title } : {};
}

/* Smart search: "smith", "john smith", "smith, john", "smith j", or an id. Every word must start a
   first name, last name or id. Last-name matches rank first. */
export function searchPeople(query: string, limit = 8): Person[] {
  const words = query.toLowerCase().replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits = PEOPLE.filter(x => {
    const parts = [x.first.toLowerCase(), x.last.toLowerCase(), x.id.toLowerCase()];
    return words.every(w => parts.some(part => part.startsWith(w)));
  });
  const rank = (x: Person) => words.some(w => x.last.toLowerCase().startsWith(w)) ? 0 : 1;
  return hits.sort((a, b) => rank(a) - rank(b) || a.last.localeCompare(b.last) || a.first.localeCompare(b.first)).slice(0, limit);
}
