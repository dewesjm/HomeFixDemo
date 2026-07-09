/* Signal-based confirm dialog request queue, replaces PrimeNG's ConfirmationService. */
import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  header?: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  accept: () => void;
  reject?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  request = signal<ConfirmRequest | null>(null);

  confirm(req: ConfirmRequest) {
    this.request.set(req);
  }

  resolve(accepted: boolean) {
    const req = this.request();
    this.request.set(null);
    if (!req) return;
    if (accepted) req.accept();
    else req.reject?.();
  }
}
