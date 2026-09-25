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
  /* extra demo population: more shared first/last names so first+last, last+PERN etc. combos matter */
  p('E40601', '40060126', 'James', 'Nguyen', 'Welder'),
  p('E40602', '40060227', 'Minh', 'Tran', 'Fitter'),
  p('E40603', '40060328', 'Sarah', 'Carter', 'NQC Inspector'),
  p('E40604', '40060429', 'Michael', 'Patel', 'Welder'),
  p('E40605', '40060530', 'Raj', 'Singh', 'Fitter'),
  p('E40606', '40060631', 'Jennifer', 'Garcia', 'Inspector'),
  p('E40607', '40060732', 'Carlos', 'Garcia', 'Welder'),
  p('E40608', '40060833', 'Kevin', 'Brown', 'Fitter'),
  p('E40609', '40060934', 'Kate', 'Miller', 'Inspector'),
  p('E40610', '40061035', 'Brian', 'Miller', 'Foreman'),
  p('E40611', '40061136', 'Lisa', 'Chen', 'Welder'),
  p('E40612', '40061237', 'Wei', 'Chen', 'Inspector'),
  p('E40613', '40061338', 'John', 'Carter', 'Fitter'),
  p('E40614', '40061439', 'Amanda', 'Johnson', 'NQC Inspector'),
  p('E40615', '40061540', 'Marcus', 'Williams', 'Welder'),
  p('E40616', '40061641', 'Tyler', 'Williams', 'Fitter'),
  p('E40617', '40061742', 'Angela', 'Davis', 'Inspector'),
  p('E40618', '40061843', 'Derek', 'Davis', 'Welder'),
  p('E40619', '40061944', 'Olivia', 'Martinez', 'O63 Records Specialist'),
  p('E40620', '40062045', 'Jose', 'Martinez', 'Foreman'),
  p('E40621', '40062146', 'Hannah', 'Lee', 'Fitter'),
  p('E40622', '40062247', 'Daniel', 'Lee', 'NQC Inspector'),
  p('E40623', '40062348', 'Grace', 'Kim', 'Inspector'),
  p('E40624', '40062449', 'Steven', 'Kim', 'Welder'),
  p('E40625', '40062550', 'Mike', 'Nair', 'Inspector'),
  p('E40626', '40062651', 'Ahmed', 'Hassan', 'Welder'),
  p('E40627', '40062752', 'Fatima', 'Hassan', 'NQC Inspector'),
  p('E40628', '40062853', 'Paul', 'Anderson', 'Foreman'),
  p('E40629', '40062954', 'Rachel', 'Anderson', 'Inspector'),
  p('E40630', '40063055', 'Victor', 'Petrov', 'Welder'),
  p('E40631', '40063156', 'Nina', 'Kowalski', 'Inspector'),
  p('E40632', '40063257', 'Greg', 'Thompson', 'Fitter'),
  p('E40633', '40063358', 'Megan', 'Thompson', 'O04 Records Specialist'),
  p('E40634', '40063459', 'Omar', 'Santos', 'Welder'),
  p('E40635', '40063560', 'Tina', 'Baxter', 'NQC Inspector'),
  p('E40636', '40063661', 'Sam', 'Okafor', 'Fitter'),
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

/* Smart search: any mix of first name, last name, id and PERN, in any order -- "smith", "john smith",
   "smith, john", "smith j", "smith 2004", "PERN 20041108", or a saved "First Last · PERN" label.
   Every word must start a first name, last name, id or PERN (the words "pern"/"id" and punctuation
   are ignored). Last-name matches rank first. */
export function searchPeople(query: string, limit = 8): Person[] {
  const words = query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter(w => w && w !== 'pern' && w !== 'id');
  if (!words.length) return [];
  const hits = PEOPLE.filter(x => {
    const parts = [x.first.toLowerCase(), x.last.toLowerCase(), x.id.toLowerCase(), x.pern.toLowerCase()];
    return words.every(w => parts.some(part => part.startsWith(w)));
  });
  const rank = (x: Person) => words.some(w => x.last.toLowerCase().startsWith(w)) ? 0 : 1;
  return hits.sort((a, b) => rank(a) - rank(b) || a.last.localeCompare(b.last) || a.first.localeCompare(b.first)).slice(0, limit);
}
