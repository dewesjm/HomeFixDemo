import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { getMwqOfflineOrigins } from './rules/mwq-offline-origins';
import { isMwqOfflineRequest, type MwqOfflineRequest } from './rules/mwq-offline-request';

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
export class OfflinePreparePageComponent implements OnInit, OnDestroy {
  protected readonly request = signal<MwqOfflineRequest | null>(null);
  protected readonly status = signal('Open this page using Get ready for offline in the MWQ simulator.');
  private readonly mwqWindow: Window | null = window.opener;
  private readonly setup = new AbortController();
  private allowedOrigins: string[] = [];

  ngOnInit(): void {
    if (!this.mwqWindow) return;
    this.status.set('Waiting for the MWQ simulator to send joints.');
    void this.listenForRequest(this.mwqWindow);
  }

  ngOnDestroy(): void {
    this.setup.abort();
    window.removeEventListener('message', this.receiveRequest);
  }

  private async listenForRequest(mwqWindow: Window): Promise<void> {
    this.allowedOrigins = await getMwqOfflineOrigins(this.setup.signal);
    if (this.setup.signal.aborted) return;
    window.addEventListener('message', this.receiveRequest);
    for (const origin of this.allowedOrigins) {
      mwqWindow.postMessage({ type: 'ewr-offline-listening' }, origin);
    }
  }

  private readonly receiveRequest = (event: MessageEvent<unknown>): void => {
    if (!this.allowedOrigins.includes(event.origin) || event.source !== this.mwqWindow) return;
    if (!isMwqOfflineRequest(event.data) || this.request()) return;

    this.request.set(event.data);
    this.status.set('Request received. Offline download is pending implementation.');
    this.mwqWindow?.postMessage({
      type: 'ewr-offline-request-received',
      requestId: event.data.requestId,
      joints: event.data.joints,
    }, event.origin);
  };
}
