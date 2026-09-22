/* Signal-based confirm dialog request queue. */
import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  header?: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  password?: boolean;
  /* a plain (unmasked) text field, e.g. capturing a reason — mutually exclusive with password */
  textInput?: { label: string; placeholder?: string };
  accept: (value?: string) => void;
  reject?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  request = signal<ConfirmRequest | null>(null);
  /* captured value for either password or textInput requests */
  inputValue = signal('');

  confirm(req: ConfirmRequest) {
    this.inputValue.set('');
    this.request.set(req);
  }

  resolve(accepted: boolean) {
    const req = this.request();
    const value = this.inputValue();
    this.request.set(null);
    this.inputValue.set('');
    if (!req) return;
    if (accepted) req.accept(value);
    else req.reject?.();
  }
}
