/* System Map's second diagram: the intended service boundaries in the real system, not how the demo runs. */
import { MapArrow, MapBox, MapGroup, MapLegend } from './map-diagram.component';

export const BOUNDARY_HEIGHT = 800;

export const BOUNDARY_GROUPS: MapGroup[] = [
  { x: 200, y: 520, w: 700, h: 220, title: 'Weld Record (one service)', caption: 'One store: a signoff changes these together' },
];

export const BOUNDARY_BOXES: MapBox[] = [
  { x: 20, y: 40, w: 280, h: 110, title: 'External joint services', lines: ["Today's joint source"], outside: true },
  { x: 400, y: 30, w: 300, h: 140, title: 'Weld Engineering', lines: ['GWPs, WTNs, revisions', 'Weld positions, quals'] },
  { x: 20, y: 260, w: 320, h: 150, title: 'Weld Planning', lines: ['Joint master data', 'Pipe and structural', 'Gives every joint its ID'] },
  { x: 740, y: 260, w: 320, h: 150, title: 'Weld Dispatch', lines: ['WACCs: who works on', 'what, right now', 'Existing system'] },
  { x: 220, y: 580, w: 126, h: 70, title: 'Routing', lines: [] },
  { x: 351, y: 580, w: 126, h: 70, title: 'Signoffs', lines: [] },
  { x: 482, y: 580, w: 126, h: 70, title: 'History', lines: [] },
  { x: 613, y: 580, w: 126, h: 70, title: 'Deviations', lines: [] },
  { x: 744, y: 580, w: 126, h: 70, title: 'Settings', lines: [] },
];

export const BOUNDARY_ARROWS: MapArrow[] = [
  { d: 'M160 150 V252', planned: true, label: { x: 172, y: 210, text: 'Joint data' } },
  { d: 'M400 100 H330 V252', label: { x: 342, y: 215, text: 'Procedures' } },
  { d: 'M700 100 H900 V252', label: { x: 800, y: 88, text: 'Procedures', anchor: 'middle' } },
  { d: 'M550 170 V512', label: { x: 562, y: 340, text: 'Procedure revisions' } },
  { d: 'M240 410 V512', label: { x: 228, y: 465, text: 'Joint changes', anchor: 'end' } },
  { d: 'M300 512 V418', label: { x: 312, y: 465, text: 'Has record data?' } },
  { d: 'M860 410 V512', label: { x: 848, y: 465, text: 'Assignments', anchor: 'end' } },
];

export const BOUNDARY_LEGEND: MapLegend = {
  flow: 'Call or event',
  outside: 'Outside system',
  planned: 'Until Weld Planning replaces it',
};

export const BOUNDARY_RULES: string[] = [
  "Each system owns its own data. The others read it through that system's calls and keep no copy.",
  'Weld Planning owns every joint and gives each one an ID that all the systems use, in place of hull + drawing + joint.',
  'Weld Planning is to replace the external joint services. Until then, Weld Record reads joints only through Weld Planning.',
  'Weld Planning asks Weld Record before removing a joint that has weld record data.',
  'Weld Record stays one service: a signoff changes the routing, its undo and History together.',
  'A signoff keeps the GWP, WTN and procedure revision in force when it was signed.',
  'Weld Positions and Qualifications belong to Weld Engineering. The demo keeps them in Weld Record.',
  'People and groups come from the company directory. Who signs which routing stays in Weld Record.',
];
