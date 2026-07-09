/* Signal-based toast queue, replaces PrimeNG's MessageService. */
import { Injectable, signal } from '@angular/core';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

export interface ToastMessage {
  id: number;
  severity: ToastSeverity;
  summary: string;
  detail?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  messages = signal<ToastMessage[]>([]);

  add(opts: { severity: ToastSeverity; summary: string; detail?: string; life?: number }) {
    const id = ++this.seq;
    this.messages.update(m => [...m, { id, severity: opts.severity, summary: opts.summary, detail: opts.detail }]);
    setTimeout(() => this.dismiss(id), opts.life ?? 3000);
  }

  dismiss(id: number) {
    this.messages.update(m => m.filter(x => x.id !== id));
  }
}
