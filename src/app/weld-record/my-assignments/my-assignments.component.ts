import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideArrowUpRight, LucideFileText, LucideChevronRight, LucideChevronDown } from '@lucide/angular';

import { ASSIGNMENTS, Assignment } from '../../data/assignments';
import { JOBS, Job } from '../../data/jobs';
import { currentRoutingLabel } from '../../data/workflow';
import { WorkflowStore } from '../services/workflow-store.service';
import { bannerFor } from '../../data/banner';
import { isShipboardShop } from '../../data/shops';
import { TableState } from '../../shared/table-state';
import { TableToolbarComponent } from '../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../shared/sort-header.component';
import { downloadCsv } from '../../data/export-csv';
import { AppDatePipe, formatDate } from '../../shared/date-format';
import { BannerPillComponent } from '../../shared/banner-pill.component';

/* Assignment plus its live routing, so the table can sort/filter/search on it like any other column */
type AssignmentRow = Assignment & { routing: string };

@Component({
  selector: 'app-my-assignments',
  standalone: true,
  imports: [BannerPillComponent, AppDatePipe, CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent, LucideArrowUpRight, LucideFileText, LucideChevronRight, LucideChevronDown],
  templateUrl: './my-assignments.component.html',
})
export class MyAssignmentsComponent {
  private router = inject(Router);
  private store = inject(WorkflowStore);

  /* XREFID is sometimes blank (mock data imperfection); a job's real key is hull + drawing + joint */
  private jobsByKey = new Map(JOBS.map(j => [`${j.hull}|${j.drawing}|${j.joint}`, j]));
  private jobFor(a: Assignment): Job | undefined {
    return this.jobsByKey.get(`${a.hull}|${a.drawing}|${a.joint}`);
  }
  /* live current routing of the linked job, same as the joint page and Search show */
  routingFor(a: Assignment): string {
    const job = this.jobFor(a);
    return job ? currentRoutingLabel(this.store.workflowFor(job)().stages) : '';
  }

  /* a Shipboard assignment's Deck/Frame/P-S-CL/Usage are the joint's own Fabrication values, live */
  isShipboard = (a: Assignment) => isShipboardShop(a.location);

  fabFor(a: Assignment): Record<string, string> {
    const job = this.jobFor(a);
    return job ? this.store.workflowFor(job)().fabricationData : {};
  }

  banner = signal(bannerFor('all'));

  /* demo only: lets you show that different roles' assignments come from different source systems;
     defaults to Welding since that's the role with the most to show */
  roleFilter = signal('Welding');
  roles = [...new Set(ASSIGNMENTS.flatMap(a => a.assignedRoles))].sort();

  /* search box covers the same fields it always did; WICC Date filters on the formatted text the column shows */
  table = new TableState<AssignmentRow>(
    ['hull', 'drawing', 'routing', 'joint', 'location'],
    { expirationDate: (v, f) => formatDate(v).toLowerCase().includes(String(f).toLowerCase().trim()) }
  );

  constructor() {
    effect(() => {
      const role = this.roleFilter();
      const list = role ? ASSIGNMENTS.filter(a => a.assignedRoles.includes(role)) : ASSIGNMENTS;
      this.table.setRows(list.map(a => ({ ...a, routing: this.routingFor(a) })));
    });
  }

  exportCsv() {
    downloadCsv('my-assignments', [
      { header: 'XREFID', value: (r: AssignmentRow) => r.jobId },
      { header: 'Hull', value: r => r.hull },
      { header: 'Drawing', value: r => r.drawing },
      { header: 'Joint', value: r => r.joint },
      { header: 'Routing', value: r => r.routing },
      { header: 'Location', value: r => r.location },
      { header: 'Specific Location', value: r => r.specificLocation },
      { header: 'Assignment #', value: r => r.assignmentNumber },
      { header: 'WICC Date', value: r => formatDate(r.expirationDate) },
      { header: 'Source', value: r => r.source },
      { header: 'Assigned By', value: r => r.assignedBy },
      { header: 'Assigned Date', value: r => formatDate(r.assignedDate) },
      { header: 'Job Description', value: r => r.jobDescription },
      { header: 'Charge', value: r => r.charge },
    ], this.table.sorted());
  }

  openDetails(a: Assignment) {
    const job = this.jobFor(a);
    if (job) this.router.navigate(['/jobs', job.id], { queryParams: { from: 'assignments' } });
  }

  /* row click expands/collapses; the Details button (own click, stopped from bubbling) navigates */
  expanded = signal<ReadonlySet<string>>(new Set());
  toggle(id: string) {
    this.expanded.update(s => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /* Code 39 (3 of 9): each character is 5 bars + 4 spaces, alternating starting with a bar;
     '0' = narrow, '1' = wide. Standard ISO/IEC 16388 character set. */
  private static readonly CODE39_PATTERNS: Record<string, string> = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
    '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
    '8': '100100100', '9': '001100100',
    A: '100001001', B: '001001001', C: '101001000', D: '000011001',
    E: '100011000', F: '001011000', G: '000001101', H: '100001100',
    I: '001001100', J: '000011100', K: '100000011', L: '001000011',
    M: '101000010', N: '000010011', O: '100010010', P: '001010010',
    Q: '000000111', R: '100000110', S: '001000110', T: '000010110',
    U: '110000001', V: '011000001', W: '111000000', X: '010010001',
    Y: '110010000', Z: '011010000',
    '-': '010000101', '.': '110000100', ' ': '011000100',
    '$': '010101000', '/': '010100010', '+': '010001010', '%': '000101010',
    '*': '010010100',
  };
  private static readonly NARROW_PX = 1.5;
  private static readonly WIDE_PX = 4.5;

  /* real Code 39 bar/space encoding, framed by start/stop '*' characters, sized wide enough
     for a handheld scanner to read off the screen */
  barcodeElements(charge: string): { bar: boolean; width: number }[] {
    const chars = `*${charge.toUpperCase()}*`;
    const out: { bar: boolean; width: number }[] = [];
    for (let i = 0; i < chars.length; i++) {
      const pattern = MyAssignmentsComponent.CODE39_PATTERNS[chars[i]] ?? MyAssignmentsComponent.CODE39_PATTERNS['*'];
      for (let j = 0; j < pattern.length; j++) {
        out.push({ bar: j % 2 === 0, width: pattern[j] === '1' ? MyAssignmentsComponent.WIDE_PX : MyAssignmentsComponent.NARROW_PX });
      }
      if (i < chars.length - 1) out.push({ bar: false, width: MyAssignmentsComponent.NARROW_PX }); /* inter-character gap */
    }
    return out;
  }
}
