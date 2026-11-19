/* Draws one System Map diagram from boxes, shaded groups and arrows. Text only; nothing here reads live data. */
import { Component, input } from '@angular/core';

export interface MapBox {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines: string[];
  /* outside systems get a dashed border */
  outside?: boolean;
}

export interface MapArrow {
  d: string;
  label?: { x: number; y: number; text: string; anchor?: 'start' | 'end' | 'middle' };
  /* drawn dashed: a link that isn't connected yet, or one that goes away later */
  planned?: boolean;
}

/* a shaded box around a system's parts */
export interface MapGroup {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  /* one line along the bottom of the group */
  caption?: string;
}

export interface MapLegend {
  /* the data-flow arrow, the dashed arrow and the dashed outside box */
  flow: string;
  planned: string;
  outside: string;
}

@Component({
  selector: 'app-map-diagram',
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
  `],
  template: `
    <div class="map-wrap">
      <svg [attr.viewBox]="'0 0 1080 ' + height()" role="img" [attr.aria-label]="label()">
        <defs>
          <marker [attr.id]="idPrefix() + '-arrow'" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--color-primary)" />
          </marker>
          <marker [attr.id]="idPrefix() + '-arrow-planned'" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--app-text)" />
          </marker>
        </defs>

        @for (g of groups(); track g.title) {
          <rect class="group" [attr.x]="g.x" [attr.y]="g.y" [attr.width]="g.w" [attr.height]="g.h" rx="10" />
          <text class="group-title" [attr.x]="g.x + 20" [attr.y]="g.y + 32">{{ g.title }}</text>
          @if (g.caption) {
            <text class="box-line" [attr.x]="g.x + 20" [attr.y]="g.y + g.h - 20">{{ g.caption }}</text>
          }
        }

        @for (a of arrows(); track a.d) {
          <path class="arrow" [class.planned]="a.planned" [attr.d]="a.d"
                [attr.marker-end]="'url(#' + idPrefix() + (a.planned ? '-arrow-planned)' : '-arrow)')" />
        }
        @for (b of boxes(); track b.title) {
          <rect class="box" [class.outside]="b.outside" [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" rx="8" />
          <text class="box-title" [attr.x]="b.x + 16" [attr.y]="b.y + 32">{{ b.title }}</text>
          @for (line of b.lines; track $index) {
            <text class="box-line" [attr.x]="b.x + 16" [attr.y]="b.y + 58 + $index * 22">{{ line }}</text>
          }
        }
        @for (a of arrows(); track a.d) {
          @if (a.label; as l) {
            <text class="label" [attr.x]="l.x" [attr.y]="l.y" [attr.text-anchor]="l.anchor ?? 'start'">{{ l.text }}</text>
          }
        }

        <line class="arrow" x1="20" [attr.y1]="height() - 15" x2="60" [attr.y2]="height() - 15" />
        <text class="legend" x="70" [attr.y]="height() - 9">{{ legend().flow }}</text>
        <rect class="box outside" x="250" [attr.y]="height() - 27" width="40" height="22" rx="4" />
        <text class="legend" x="300" [attr.y]="height() - 9">{{ legend().outside }}</text>
        <line class="arrow planned" x1="480" [attr.y1]="height() - 15" x2="520" [attr.y2]="height() - 15" />
        <text class="legend" x="530" [attr.y]="height() - 9">{{ legend().planned }}</text>
      </svg>
    </div>
  `,
})
export class MapDiagramComponent {
  readonly idPrefix = input.required<string>();
  readonly label = input.required<string>();
  readonly height = input.required<number>();
  readonly groups = input<MapGroup[]>([]);
  readonly boxes = input<MapBox[]>([]);
  readonly arrows = input<MapArrow[]>([]);
  readonly legend = input.required<MapLegend>();
}
