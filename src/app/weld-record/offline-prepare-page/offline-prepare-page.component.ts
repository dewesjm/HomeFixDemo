import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { OfflinePreparationService, type OfflinePreparationResult } from '../offline-logic/offline-preparation.service';
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
      @if (result(); as outcome) {
        @if (outcome.error) { <p class="text-error">{{ outcome.error }}</p> }
        <ul class="mt-2">
          @for (item of outcome.joints; track $index) {
            <li>
              @if (item.ready) {
                <a class="link" [href]="item.url">{{ item.key.joint }} · Open offline copy</a>
              } @else {
                <span class="text-error">{{ item.error }}</span>
              }
            </li>
          }
        </ul>
        @if (!outcome.ready) {
          <button class="btn btn-sm mt-2" (click)="retry()">Retry</button>
        }
      }
    </section>
  `,
})
export class OfflinePreparePageComponent implements OnInit, OnDestroy {
  protected readonly request = signal<MwqOfflineRequest | null>(null);
  protected readonly result = signal<OfflinePreparationResult | null>(null);
  protected readonly status = signal('Open this page using Get ready for offline in the MWQ simulator.');
  private readonly preparation = inject(OfflinePreparationService);
  private readonly mwqWindow: Window | null = window.opener;
  private readonly setup = new AbortController();
  private allowedOrigins: string[] = [];
  private mwqOrigin = '';

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
    const message = event.data as { type?: unknown; requestId?: unknown } | null;
    if (event.origin === this.mwqOrigin && this.result()?.ready
      && message?.type === 'ewr-offline-result-received' && message.requestId === this.request()?.requestId) {
      window.close();
      return;
    }
    if (!isMwqOfflineRequest(event.data) || this.request()) return;

    this.mwqOrigin = event.origin;
    this.request.set(event.data);
    this.mwqWindow?.postMessage({
      type: 'ewr-offline-request-received',
      requestId: event.data.requestId,
      joints: event.data.joints,
    }, event.origin);
    this.retry();
  };

  protected retry(): void {
    const request = this.request();
    if (request) void this.prepare(request);
  }

  private async prepare(request: MwqOfflineRequest): Promise<void> {
    this.result.set(null);
    this.status.set('Saving Joint Details for offline use…');
    const result = await this.preparation.prepareOffline(request.joints);
    if (this.setup.signal.aborted) return;
    this.result.set(result);
    this.status.set(result.ready ? 'Ready for offline' : 'Could not prepare all joints for offline use.');
    this.mwqWindow?.postMessage({
      type: 'ewr-offline-result', requestId: request.requestId, ...result,
    }, this.mwqOrigin);
  }
}
