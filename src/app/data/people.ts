/* Mock people directory. In the real system this is a live lookup against an external system, not a list in the bundle. */
export interface Person {
  id: string;      /* employee identifier, unused by the UI for now */
  pern: string;    /* personnel number (8-digit, SAP-style), searchable alongside name/id */
  first: string;
  last: string;
  title: string;   /* current title; history entries keep the title held at the time */
}

const p = (id: string, pern: string, first: string, last: string, title: string): Person => ({ id, pern, first, last, title });

export const PEOPLE: Person[] = [
  /* technicians (job assignees) */
  p('E10231', '10023101', 'Mike', 'Rourke', 'Welder'),
  p('E10232', '10023202', 'Sara', 'Lindqvist', 'Welder'),
  p('E10233', '10023303', 'Tom', 'Baxter', 'Fitter'),
  p('E10234', '10023404', 'Dave', 'Kowalski', 'Welder'),
  p('E10235', '10023505', 'Priya', 'Nair', 'Fitter'),
  p('E10236', '10023606', 'Luis', 'Gomez', 'Welder'),
  p('E10237', '10023707', 'Emma', 'Whitfield', 'Fitter'),
  /* inspectors and records */
  p('E20411', '20041108', 'James', 'Carter', 'Inspector'),
  p('E20412', '20041209', 'Minh', 'Nguyen', 'NQC Inspector'),
  p('E20413', '20041310', 'Raj', 'Patel', 'Inspector'),
  p('E20414', '20041411', 'Samantha', 'Williams', 'NQC Inspector'),
  p('E20415', '20041512', 'Tina', 'Garcia', 'Inspector'),
  p('E20416', '20041613', 'Amar', 'Singh', 'Inspector'),
  p('E20417', '20041714', 'Kate', 'Brown', 'O63 Records Specialist'),
  p('E20418', '20041815', 'Lily', 'Chen', 'NQC Inspector'),
  /* supervisors and others, with repeated names so search has to disambiguate */
  p('E30501', '30050116', 'John', 'Johnson', 'Foreman'),
  p('E30502', '30050217', 'Robert', 'Johnson', 'Welder'),
  p('E30503', '30050318', 'Mike', 'Roberts', 'Fitter'),
  p('E30504', '30050419', 'Sara', 'Lee', 'Inspector'),
  p('E30505', '30050520', 'David', 'Kim', 'Foreman'),
  p('E30506', '30050621', 'Maria', 'Santos', 'O04 Records Specialist'),
  p('E30507', '30050722', 'Tom', 'Brown', 'Welder'),
  p('E30508', '30050823', 'Anna', 'Petrov', 'Fitter'),
  p('E30509', '30050924', 'Chris', 'Okafor', 'NQC Inspector'),
  p('E30510', '30051025', 'Dana', 'Whitfield', 'Foreman'),
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

/* Smart search: "smith", "john smith", "smith, john", "smith j", an id, or a PERN. Every word must
   start a first name, last name, id or PERN. Last-name matches rank first. */
export function searchPeople(query: string, limit = 8): Person[] {
  const words = query.toLowerCase().replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits = PEOPLE.filter(x => {
    const parts = [x.first.toLowerCase(), x.last.toLowerCase(), x.id.toLowerCase(), x.pern.toLowerCase()];
    return words.every(w => parts.some(part => part.startsWith(w)));
  });
  const rank = (x: Person) => words.some(w => x.last.toLowerCase().startsWith(w)) ? 0 : 1;
  return hits.sort((a, b) => rank(a) - rank(b) || a.last.localeCompare(b.last) || a.first.localeCompare(b.first)).slice(0, limit);
}
