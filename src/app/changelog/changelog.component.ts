/* Quick Links > Change Log: plain-language list of this week's changes (data/changelog.ts) */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CHANGE_LOG } from '../data/changelog';

@Component({
  selector: 'app-changelog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './changelog.component.html'
})
export class ChangelogComponent {
  days = CHANGE_LOG;
  sections = [
    { key: 'added' as const, label: 'New', badge: 'badge-success' },
    { key: 'changed' as const, label: 'Changed', badge: 'badge-info' },
    { key: 'fixed' as const, label: 'Fixed', badge: 'badge-warning' },
  ];

  /* 'Friday, September 25'; parsed as a local date so it doesn't shift a day */
  dayLabel(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}
