/* Renders queued toasts (bottom-right), DaisyUI toast + alert. Mounted once in app.component.html. */
import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

const ALERT_CLASS: Record<string, string> = {
  success: 'alert-success',
  info: 'alert-info',
  warn: 'alert-warning',
  error: 'alert-error'
};

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="toast toast-end toast-bottom z-50">
      @for (m of toast.messages(); track m.id) {
        <div class="alert" [class]="alertClass(m.severity)">
          <div>
            <span class="font-semibold">{{ m.summary }}</span>
            @if (m.detail) {
              <div class="text-xs opacity-80">{{ m.detail }}</div>
            }
          </div>
          <button type="button" class="btn btn-ghost btn-xs" (click)="toast.dismiss(m.id)">✕</button>
        </div>
      }
    </div>
  `
})
export class ToastHostComponent {
  toast = inject(ToastService);
  alertClass(severity: string): string {
    return ALERT_CLASS[severity] ?? 'alert-info';
  }
}
