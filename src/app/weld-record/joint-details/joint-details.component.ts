import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideInfo, LucideChevronDown, LucideChevronUp } from '@lucide/angular';
import { Job, N_IND_MEANINGS } from '../../data/jobs';
import { TooltipDirective } from '../../shared/tooltip.directive';
import { characteristicLabel } from '../../data/characteristics';

@Component({
  selector: 'app-joint-details',
  standalone: true,
  imports: [CommonModule, LucideInfo, LucideChevronDown, LucideChevronUp, TooltipDirective],
  templateUrl: './joint-details.component.html'
})
export class JointDetailsComponent {
  job = input.required<Job>();
  currentRouting = input.required<string>();

  showAudit = signal(false);

  nIndTooltip(): string {
    return N_IND_MEANINGS[this.job().nInd] ?? '';
  }

  /* "AB123 Description" when the code is known, otherwise just the bare code */
  attrCodeDisplay(code: string): string {
    if (!code) return '';
    const desc = characteristicLabel(code);
    return desc ? `${code} ${desc}` : code;
  }

  ndtLabel(method: string): string {
    const ndt = (this.job().ndt || '').toUpperCase();
    const has = (m: string) => ndt.includes(m);
    if (method === 'rtRoot' || method === 'rtFinal' || method === 'ndtRoot' || method === 'ndtEach' || method === 'ndtFinal') {
      return this.job()[method] || '-';
    }
    if (method === 'ut') return has('UT') ? 'X' : '-';
    if (method === 'vt') {
      if (has('5X')) return '5X';
      return has('VT') || has('VISUAL') ? 'X' : '-';
    }
    return '-';
  }
}
