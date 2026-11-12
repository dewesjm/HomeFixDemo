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

interface SystemNote {
  title: string;
  status: string;
  items: string[];
}

const BOXES: MapBox[] = [
  { x: 20, y: 40, w: 220, h: 100, title: 'Vendor File', lines: ['Planned joints,', 'full file hourly'], outside: true },
  { x: 330, y: 40, w: 240, h: 100, title: 'External Loads', lines: ['In Weld Planning:', 'checks and converts'] },
  { x: 660, y: 40, w: 340, h: 100, title: 'Weld Planning Joints', lines: ['Joint list, search,', 'mass import'] },
  { x: 330, y: 210, w: 240, h: 100, title: 'Weld Assignment', lines: ['Picks GWP, WTN, filler', '(stand-in in the demo)'], outside: true },
  { x: 660, y: 210, w: 340, h: 100, title: 'Weld Engineering', lines: ['GWPs and their WTNs,', 'one PDF per WTN'] },
  { x: 280, y: 440, w: 170, h: 100, title: 'Pipe Welding', lines: ['Find a joint'] },
  { x: 500, y: 440, w: 260, h: 100, title: 'Joint Page', lines: ['Routings and signoffs'] },
  { x: 820, y: 440, w: 180, h: 100, title: 'History', lines: ['Every signoff'] },
  { x: 500, y: 590, w: 260, h: 100, title: 'Admin', lines: ['Routings, signoff', 'forms and rules'] },
];

const ARROWS: MapArrow[] = [
  { d: 'M240 90 H322', label: { x: 285, y: 78, text: 'Hourly', anchor: 'middle' } },
  { d: 'M570 90 H652', label: { x: 615, y: 78, text: 'Merge', anchor: 'middle' } },
  { d: 'M830 210 V148', label: { x: 842, y: 184, text: 'GWP choices' } },
  { d: 'M520 310 V432', label: { x: 508, y: 372, text: 'Sets GWP, WTN, filler', anchor: 'end' } },
  { d: 'M700 310 V432', label: { x: 712, y: 372, text: 'GWP, WTN and filler lists' } },
  { d: 'M450 490 H492' },
  { d: 'M760 490 H812' },
  { d: 'M630 590 V548' },
  { d: 'M1000 90 H1050 V398 H1038', planned: true },
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
    title: 'Outside systems', status: 'Dashed boxes',
    items: [
      'Vendor File: the full list of planned joints, sent hourly. The demo shows sample files only.',
      'Weld Assignment: sets the GWP, WTN and filler on welding routings. The demo uses a stand-in.',
    ],
  },
  {
    title: 'Not connected yet', status: 'Dashed line',
    items: [
      'Weld Planning and Weld Record name a joint the same way (hull + drawing + joint), but each has its own sample joints.',
      'The vendor load never removes a joint that has weld record data.',
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
    .group-title { font-weight: 700; }
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
          <svg viewBox="0 0 1080 740" role="img" aria-label="How the systems feed each other">
            <defs>
              <marker id="sm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="var(--color-primary)" />
              </marker>
              <marker id="sm-arrow-planned" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="var(--app-text)" />
              </marker>
            </defs>

            <rect class="group" x="260" y="380" width="770" height="330" rx="10" />
            <text class="group-title" x="280" y="414">Weld Record</text>

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

            <line class="arrow" x1="20" y1="728" x2="60" y2="728" />
            <text class="legend" x="70" y="734">Data flow</text>
            <rect class="box outside" x="180" y="716" width="40" height="22" rx="4" />
            <text class="legend" x="230" y="734">Outside system</text>
            <line class="arrow planned" x1="380" y1="728" x2="420" y2="728" />
            <text class="legend" x="430" y="734">Not connected yet</text>
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
  readonly boxes = BOXES;
  readonly arrows = ARROWS;
  readonly notes = NOTES;
}
