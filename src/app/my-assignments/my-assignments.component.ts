import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideClipboardList, LucideArrowUpRight, LucideFileText, LucideMegaphone, LucideChevronRight, LucideChevronDown } from '@lucide/angular';

import { ASSIGNMENTS, Assignment } from '../data/assignments';
import { JOBS } from '../data/jobs';
import { bannerFor } from '../data/banner';

@Component({
  selector: 'app-my-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideClipboardList, LucideArrowUpRight, LucideFileText, LucideMegaphone, LucideChevronRight, LucideChevronDown],
  templateUrl: './my-assignments.component.html',
})
export class MyAssignmentsComponent {
  private router = inject(Router);

  keyword = signal('');
  banner = signal(bannerFor('all'));

  /* demo only: lets you show that different roles' assignments come from different source systems;
     defaults to Welding since that's the role with the most to show */
  roleFilter = signal('Welding');
  roles = [...new Set(ASSIGNMENTS.flatMap(a => a.assignedRoles))].sort();

  assignments = computed(() => {
    let list = ASSIGNMENTS;
    const role = this.roleFilter();
    if (role) list = list.filter(a => a.assignedRoles.includes(role));
    const q = this.keyword().toLowerCase().trim();
    if (!q) return list;
    return list.filter(a =>
      a.hull.toLowerCase().includes(q) ||
      a.drawing.toLowerCase().includes(q) ||
      a.routing.toLowerCase().includes(q) ||
      a.joint.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q)
    );
  });

  /* XREFID is sometimes blank (mock data imperfection); a job's real key is hull + drawing + joint */
  openDetails(a: Assignment) {
    const job = JOBS.find(j => j.hull === a.hull && j.drawing === a.drawing && j.joint === a.joint);
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
