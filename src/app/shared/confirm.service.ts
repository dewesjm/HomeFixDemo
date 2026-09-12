/* Signal-based confirm dialog request queue, replaces PrimeNG's ConfirmationService. */
import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  header?: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  password?: boolean;
  accept: (password?: string) => void;
  reject?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  request = signal<ConfirmRequest | null>(null);
  password = signal('');

  confirm(req: ConfirmRequest) {
    this.password.set('');
    this.request.set(req);
  }

  resolve(accepted: boolean) {
    const req = this.request();
    const pw = this.password();
    this.request.set(null);
    this.password.set('');
    if (!req) return;
    if (accepted) req.accept(pw);
    else req.reject?.();
  }
}
