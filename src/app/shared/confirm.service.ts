/* Signal-based confirm dialog request queue. */
import { Injectable, signal } from '@angular/core';

interface ConfirmRequest {
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

  /* every admin delete asks first; `what` names the row, e.g. "PT - PO" */
  confirmDelete(what: string, accept: () => void) {
    this.confirm({ header: 'Delete', message: `Delete ${what}?`, acceptLabel: 'Delete', accept });
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
