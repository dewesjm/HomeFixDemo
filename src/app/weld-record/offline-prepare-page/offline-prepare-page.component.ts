import { Component, OnDestroy, signal } from '@angular/core';
import { isMwqOfflineRequest, MWQ_SIMULATOR_ORIGIN, type MwqOfflineRequest } from './rules/mwq-offline-request';

@Component({
  selector: 'app-offline-prepare-page',
  template: `
    <section class="p-4">
      <h1 class="text-xl font-semibold">Prepare Weld Record for offline use</h1>
      <p class="mt-2" role="status">{{ status() }}</p>
      @if (request(); as received) {
        <p>Request {{ received.requestId }}</p>
        <ul class="mt-2 list-disc pl-6">
          @for (joint of received.joints; track $index) {
            <li>{{ joint.hull }} / {{ joint.drawing }} / {{ joint.joint }}</li>
          }
        </ul>
      }
    </section>
  `,
})
export class OfflinePreparePageComponent implements OnDestroy {
  protected readonly request = signal<MwqOfflineRequest | null>(null);
  protected readonly status = signal('Open this page using Get ready for offline in the MWQ simulator.');
  private readonly mwqWindow: Window | null = window.opener;

  constructor() {
    if (!this.mwqWindow) return;
    this.status.set('Waiting for the MWQ simulator to send joints.');
    window.addEventListener('message', this.receiveRequest);
    this.mwqWindow.postMessage({ type: 'ewr-offline-listening' }, MWQ_SIMULATOR_ORIGIN);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.receiveRequest);
  }

  private readonly receiveRequest = (event: MessageEvent<unknown>): void => {
    if (event.origin !== MWQ_SIMULATOR_ORIGIN || event.source !== this.mwqWindow) return;
    if (!isMwqOfflineRequest(event.data) || this.request()) return;

    this.request.set(event.data);
    this.status.set('Request received. Offline download is pending implementation.');
    this.mwqWindow?.postMessage({
      type: 'ewr-offline-request-received',
      requestId: event.data.requestId,
      joints: event.data.joints,
    }, MWQ_SIMULATOR_ORIGIN);
  };
}
