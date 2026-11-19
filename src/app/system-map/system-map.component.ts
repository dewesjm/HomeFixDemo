/* Quick Links > System Map: how the app's systems and the outside systems feed each other, as a diagram
   plus a short read-me per system, then the intended service boundaries (service-boundaries.ts).
   Text only; nothing here reads live data. */
import { Component } from '@angular/core';
import { MapArrow, MapBox, MapDiagramComponent, MapGroup, MapLegend } from './map-diagram.component';
import {
  BOUNDARY_ARROWS, BOUNDARY_BOXES, BOUNDARY_GROUPS, BOUNDARY_HEIGHT, BOUNDARY_LEGEND, BOUNDARY_RULES,
} from './service-boundaries';

interface SystemNote {
  title: string;
  status: string;
  /* what the system is for, in one line */
  purpose?: string;
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
  { x: 280, y: 285, w: 320, h: 90, title: 'WACCs', lines: ['Foreman assigns work', 'to welders and fitters'] },
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
  { d: 'M680 330 H608', label: { x: 640, y: 318, text: 'Allowed', anchor: 'middle' } },
  { d: 'M520 375 V492', label: { x: 508, y: 426, text: 'Sets GWP, WTN, filler', anchor: 'end' } },
  { d: 'M700 375 V492', label: { x: 712, y: 426, text: 'GWP, WTN and filler lists' } },
  { d: 'M450 550 H492' },
  { d: 'M760 550 H812' },
  { d: 'M630 655 V608' },
  { d: 'M1010 120 H1055 V470 H1038', planned: true },
];

const LEGEND: MapLegend = { flow: 'Data flow', outside: 'Outside system', planned: 'Not connected yet' };

const NOTES: SystemNote[] = [
  {
    title: 'Weld Planning', status: 'Future',
    purpose: 'Maintenance, creation and load of weld joint master data.',
    items: [
      'Joints come from the vendor file (External Loads) or are added and mass imported by hand.',
      'Each joint picks a GWP from Weld Engineering.',
    ],
  },
  {
    title: 'Weld Dispatch', status: 'Existing system',
    purpose: 'The foreman assigns work to a welder or fitter.',
    items: [
      "An existing system that this prototype doesn't build. Its menu items here (Active WACCs, Create WACC, Filler Metal Attendant, History Lookup) are placeholders.",
      "Each assignment carries a GWP, WTN and filler metal, from what Weld Engineering's procedures allow. It shows on Weld Record's welding routings; the demo uses a stand-in for this.",
    ],
  },
  {
    title: 'Weld Engineering', status: 'Future',
    purpose: 'Definition of weld procedures and requirements.',
    items: [
      'Each GWP has WTNs, and each WTN has its own PDF.',
      'Weld Planning, Weld Dispatch and Weld Record read GWP, WTN, filler and limits from here. No other system keeps its own copy.',
    ],
  },
  {
    title: 'Weld Record', status: 'Being built now',
    purpose: 'OQE and signoff: the execution record.',
    items: [
      'Pipe Welding finds a joint, and the joint page takes it through its routings (Fit, Tack, Root, NDT and on to Sold), one signoff at a time.',
      'History keeps every signoff. Makeup lists acting-foreman grants.',
      'Admin pages set the routings, the signoff forms and the rules for both.',
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
  imports: [MapDiagramComponent],
  styles: [`
    .notes { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1rem; }
    ul { margin: 0.5rem 0 0; padding-left: 1.25rem; list-style: disc; display: flex; flex-direction: column; gap: 0.35rem; }
  `],
  template: `
    <div class="table-page-wrap">
      <h2 class="section-title">System Map</h2>

      <section class="panel max-w-6xl">
        <app-map-diagram idPrefix="sm" label="How the systems feed each other" [height]="830"
                         [groups]="groups" [boxes]="boxes" [arrows]="arrows" [legend]="legend" />
      </section>

      <div class="notes mt-4 max-w-6xl">
        @for (n of notes; track n.title) {
          <section class="panel">
            <h3 class="panel-title">{{ n.title }} <span class="badge badge-ghost">{{ n.status }}</span></h3>
            @if (n.purpose) { <p class="mt-2 font-semibold">{{ n.purpose }}</p> }
            <ul>
              @for (item of n.items; track $index) { <li>{{ item }}</li> }
            </ul>
          </section>
        }
      </div>

      <h3 class="section-title mt-8">Service Boundaries</h3>
      <p class="mt-2">How the systems are meant to split in the real system. The demo runs all of them in the browser.</p>
      <section class="panel max-w-6xl mt-4">
        <app-map-diagram idPrefix="sb" label="Intended service boundaries" [height]="boundaryHeight"
                         [groups]="boundaryGroups" [boxes]="boundaryBoxes" [arrows]="boundaryArrows" [legend]="boundaryLegend" />
      </section>
      <section class="panel max-w-6xl mt-4">
        <h3 class="panel-title">Boundary rules <span class="badge badge-ghost">Intended</span></h3>
        <ul>
          @for (rule of boundaryRules; track $index) { <li>{{ rule }}</li> }
        </ul>
      </section>

      <p class="mt-4">Everything runs in the browser. Saved changes stay in this browser only.</p>
    </div>
  `,
})
export class SystemMapComponent {
  readonly groups = GROUPS;
  readonly boxes = BOXES;
  readonly arrows = ARROWS;
  readonly legend = LEGEND;
  readonly notes = NOTES;
  readonly boundaryHeight = BOUNDARY_HEIGHT;
  readonly boundaryGroups = BOUNDARY_GROUPS;
  readonly boundaryBoxes = BOUNDARY_BOXES;
  readonly boundaryArrows = BOUNDARY_ARROWS;
  readonly boundaryLegend = BOUNDARY_LEGEND;
  readonly boundaryRules = BOUNDARY_RULES;
}
