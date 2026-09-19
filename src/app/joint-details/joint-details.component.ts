import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideInfo, LucideChevronDown, LucideChevronUp } from '@lucide/angular';
import { Job } from '../data/jobs';

@Component({
  selector: 'app-joint-details',
  standalone: true,
  imports: [CommonModule, LucideInfo, LucideChevronDown, LucideChevronUp],
  templateUrl: './joint-details.component.html'
})
export class JointDetailsComponent {
  job = input.required<Job>();
  currentStep = input.required<string>();

  showAudit = signal(false);

  ndtLabel(method: string): string {
    const ndt = (this.job().ndt || '').toUpperCase();
    const has = (m: string) => ndt.includes(m);
    if (method === 'rtRoot' || method === 'rtFinal') return has('RT') ? 'X' : '—';
    if (method === 'ut') return has('UT') ? 'X' : '—';
    if (method === 'ndtRoot' || method === 'ndtEach' || method === 'ndtFinal') {
      if (has('5X')) return '5X';
      if (has('UT') || has('RT') || has('MT') || has('PT') || has('VISUAL') || has('VT')) return 'X';
      return '—';
    }
    return '—';
  }
}
