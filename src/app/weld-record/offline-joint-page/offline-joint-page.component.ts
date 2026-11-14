import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { loadOfflineJoint } from '../../data/offline-joints';
import { JointDetailsPanelComponent } from '../joint-details-panel/joint-details-panel.component';

@Component({
  selector: 'app-offline-joint-page',
  imports: [JointDetailsPanelComponent],
  template: `
    <h1 class="section-title">Offline Joint Details</h1>
    @if (snapshot; as saved) {
      <p class="text-sm mb-sm">Saved copy · Read-only</p>
      <app-joint-details-panel [job]="saved.job" [currentRouting]="saved.currentRouting" />
    } @else {
      <p>This joint is unavailable on this device. Reconnect and prepare it for offline use.</p>
    }
  `,
})
export class OfflineJointPageComponent {
  private readonly params = inject(ActivatedRoute).snapshot.paramMap;
  protected readonly snapshot = loadOfflineJoint({
    hull: this.params.get('hull') ?? '',
    drawing: this.params.get('drawing') ?? '',
    joint: this.params.get('joint') ?? '',
  });
}
