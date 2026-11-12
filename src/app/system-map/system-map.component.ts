/* Quick Links > System Map: how the app's systems and the outside systems feed each other, as a diagram
   plus a short read-me per system. Text only; nothing here reads live data. */
import { Component } from '@angular/core';

interface MapBox {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines: string[];
  /* outside systems get a dashed border */
  outside?: boolean;
}

interface MapArrow {
  d: string;
  label?: { x: number; y: number; text: string; anchor?: 'start' | 'end' | 'middle' };
  /* planned link, not connected in the demo */
  planned?: boolean;
}

/* one of the four systems, drawn as a shaded box around its parts */
interface MapGroup {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
}

interface SystemNote {
  title: string;
  status: string;
  items: string[];
}

const GROUPS: MapGroup[] = [
  { x: 260, y: 20, w: 770, h: 170, title: 'Weld Planning' },
  { x: 260, y: 230, w: 360, h: 170, title: 'Weld Dispatch' },
  { x: 660, y: 230, w: 370, h: 170, title: 'Weld Engineering' },
  { x: 260, y: 440, w: 770, h: 340, title: 'Weld Record' },
];

const BOXES: MapBox[] = [
  { x: 20, y: 75, w: 180, h: 90, title: 'Vendor File', lines: ['Planned joints,', 'full file hourly'], outside: true },
  { x: 280, y: 75, w: 260, h: 90, title: 'External Loads', lines: ['Checks and converts', 'the vendor file'] },
  { x: 640, y: 75, w: 370, h: 90, title: 'Joints', lines: ['Joint list, search,', 'mass import'] },
  { x: 280, y: 285, w: 320, h: 90, title: 'WICCs', lines: ['Not built yet: menu', 'items are placeholders'] },
  { x: 680, y: 285, w: 330, h: 90, title: 'Procedures', lines: ['GWPs and their WTNs,', 'one PDF per WTN'] },
  { x: 280, y: 500, w: 170, h: 100, title: 'Pipe Welding', lines: ['Find a joint'] },
  { x: 500, y: 500, w: 260, h: 100, title: 'Joint Page', lines: ['Routings and signoffs'] },
  { x: 820, y: 500, w: 190, h: 100, title: 'History', lines: ['Every signoff'] },
  { x: 500, y: 655, w: 260, h: 100, title: 'Admin', lines: ['Routings, signoff', 'forms and rules'] },
];

const ARROWS: MapArrow[] = [
  { d: 'M200 120 H272', label: { x: 236, y: 108, text: 'Hourly', anchor: 'middle' } },
  { d: 'M540 120 H632', label: { x: 586, y: 108, text: 'Merge', anchor: 'middle' } },
  { d: 'M960 285 V173', label: { x: 948, y: 216, text: 'GWP choices', anchor: 'end' } },
  { d: 'M520 375 V492', label: { x: 508, y: 426, text: 'Sets GWP, WTN, filler', anchor: 'end' } },
  { d: 'M700 375 V492', label: { x: 712, y: 426, text: 'GWP, WTN and filler lists' } },
  { d: 'M450 550 H492' },
  { d: 'M760 550 H812' },
  { d: 'M630 655 V608' },
  { d: 'M1010 120 H1055 V470 H1038', planned: true },
];

const NOTES: SystemNote[] = [
  {
    title: 'Weld Record', status: 'Being built now',
    items: [
      'Where joints are worked. Pipe Welding finds a joint, and the joint page takes it through its routings (Fit, Tack, Root, NDT and on to Sold), one signoff at a time.',
      'History keeps every signoff. Makeup lists acting-foreman grants.',
      'Admin pages set the routings, the signoff forms and the rules for both.',
    ],
  },
  {
    title: 'Weld Planning', status: 'Future',
    items: [
      'The planned joints. They come from the vendor file (External Loads) or are added and mass imported by hand.',
      'Each joint picks a GWP from Weld Engineering.',
    ],
  },
  {
    title: 'Weld Engineering', status: 'Future',
    items: [
      'The weld procedures: each GWP has WTNs, and each WTN has its own PDF.',
      'Weld Planning and Weld Record read GWP, WTN, filler and limits from here. No other system keeps its own copy.',
    ],
  },
  {
    title: 'Weld Dispatch', status: 'Not built yet',
    items: [
      'WICCs: Active WICCs, Create WICC, Filler Metal Attendant and History Lookup. Its menu items are placeholders for now.',
      "Sets the GWP, WTN and filler on Weld Record's welding routings. The demo uses a stand-in for this.",
    ],
  },
  {
    title: 'Outside and not connected', status: 'Dashed',
    items: [
      'Vendor File (dashed box): the full list of planned joints, sent hourly. The demo shows sample files only.',
      'Dashed line: Weld Planning and Weld Record name a joint the same way (hull + drawing + joint), but each has its own sample joints. The vendor load never removes a joint that has weld record data.',
    ],
  },
];

@Component({
  selector: 'app-system-map',
  standalone: true,
  styles: [`
    /* scrolls sideways on a phone instead of widening the page */
    .map-wrap { overflow-x: auto; contain: inline-size; }
    svg { display: block; width: 100%; min-width: 760px; max-width: 1100px; height: auto; }
    .box { fill: var(--app-surface); stroke: var(--app-text); stroke-width: 1.5; }
    .box.outside { stroke-dasharray: 7 5; }
    .group { fill: var(--app-muted); stroke: var(--app-border); }
    .box-title { font-weight: 700; font-size: 19px; fill: var(--app-text); }
    .box-line, .label, .group-title, .legend { font-size: 17px; fill: var(--app-text); }
    .group-title { font-weight: 700; font-size: 21px; }
    .label { paint-order: stroke; stroke: var(--app-surface); stroke-width: 6px; stroke-linejoin: round; }
    .arrow { fill: none; stroke: var(--color-primary); stroke-width: 2.5; }
    .arrow.planned { stroke: var(--app-text); stroke-dasharray: 7 5; }
    .notes { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1rem; }
    .notes ul { margin: 0.5rem 0 0; padding-left: 1.25rem; list-style: disc; display: flex; flex-direction: column; gap: 0.35rem; }
  `],
  template: `
    <div class="table-page-wrap">
      <h2 class="section-title">System Map</h2>

      <section class="panel max-w-6xl">
        <div class="map-wrap">
          <svg viewBox="0 0 1080 830" role="img" aria-label="How the systems feed each other">
            <defs>
              <marker id="sm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="var(--color-primary)" />
              </marker>
              <marker id="sm-arrow-planned" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="var(--app-text)" />
              </marker>
            </defs>

            @for (g of groups; track g.title) {
              <rect class="group" [attr.x]="g.x" [attr.y]="g.y" [attr.width]="g.w" [attr.height]="g.h" rx="10" />
              <text class="group-title" [attr.x]="g.x + 20" [attr.y]="g.y + 32">{{ g.title }}</text>
            }

            @for (a of arrows; track a.d) {
              <path class="arrow" [class.planned]="a.planned" [attr.d]="a.d"
                    [attr.marker-end]="a.planned ? 'url(#sm-arrow-planned)' : 'url(#sm-arrow)'" />
            }
            @for (b of boxes; track b.title) {
              <rect class="box" [class.outside]="b.outside" [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" rx="8" />
              <text class="box-title" [attr.x]="b.x + 16" [attr.y]="b.y + 32">{{ b.title }}</text>
              @for (line of b.lines; track $index) {
                <text class="box-line" [attr.x]="b.x + 16" [attr.y]="b.y + 58 + $index * 22">{{ line }}</text>
              }
            }
            @for (a of arrows; track a.d) {
              @if (a.label; as l) {
                <text class="label" [attr.x]="l.x" [attr.y]="l.y" [attr.text-anchor]="l.anchor ?? 'start'">{{ l.text }}</text>
              }
            }

            <line class="arrow" x1="20" y1="815" x2="60" y2="815" />
            <text class="legend" x="70" y="821">Data flow</text>
            <rect class="box outside" x="180" y="803" width="40" height="22" rx="4" />
            <text class="legend" x="230" y="821">Outside system</text>
            <line class="arrow planned" x1="380" y1="815" x2="420" y2="815" />
            <text class="legend" x="430" y="821">Not connected yet</text>
          </svg>
        </div>
      </section>

      <div class="notes mt-4 max-w-6xl">
        @for (n of notes; track n.title) {
          <section class="panel">
            <h3 class="panel-title">{{ n.title }} <span class="badge badge-ghost">{{ n.status }}</span></h3>
            <ul>
              @for (item of n.items; track $index) { <li>{{ item }}</li> }
            </ul>
          </section>
        }
      </div>

      <p class="mt-4">Everything runs in the browser. Saved changes stay in this browser only.</p>
    </div>
  `,
})
export class SystemMapComponent {
  readonly groups = GROUPS;
  readonly boxes = BOXES;
  readonly arrows = ARROWS;
  readonly notes = NOTES;
}
