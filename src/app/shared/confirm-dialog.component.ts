/* Renders the pending confirm request, if any, as a native <dialog> + DaisyUI modal. */
import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <dialog #dlg class="modal">
      @if (confirm.request(); as req) {
        <div class="modal-box">
          @if (req.header) {
            <h3 class="text-lg font-semibold">{{ req.header }}</h3>
          }
          <p class="py-4">{{ req.message }}</p>
          @if (req.password) {
            <div class="mb-4">
              <label class="meta mb-1 block">Password</label>
              <input #focusInput type="password" class="input input-bordered w-full"
                     autocomplete="off" data-lpignore="true" data-1p-ignore="true"
                     placeholder="Enter password to confirm"
                     [ngModel]="confirm.inputValue()"
                     (ngModelChange)="confirm.inputValue.set($event)"
                     (keydown.enter)="respond(true)" />
            </div>
          }
          @if (req.textInput; as ti) {
            <div class="mb-4">
              <label class="meta mb-1 block">{{ ti.label }}</label>
              <input #focusInput type="text" class="input input-bordered w-full"
                     [placeholder]="ti.placeholder ?? ''"
                     [ngModel]="confirm.inputValue()"
                     (ngModelChange)="confirm.inputValue.set($event)"
                     (keydown.enter)="respond(true)" />
            </div>
          }
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" (click)="respond(false)">
              {{ req.rejectLabel ?? 'Cancel' }}
            </button>
            <button type="button" class="btn btn-primary"
                    [disabled]="(req.password || req.textInput) && !confirm.inputValue().trim()"
                    (click)="respond(true)">
              {{ req.acceptLabel ?? 'Confirm' }}
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" (click)="respond(false)">close</button>
        </form>
      }
    </dialog>
  `
})
export class ConfirmDialogComponent {
  confirm = inject(ConfirmService);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  private focusInput = viewChild<ElementRef<HTMLInputElement>>('focusInput');

  constructor() {
    effect(() => {
      const open = !!this.confirm.request();
      const el = this.dlg().nativeElement;
      if (open && !el.open) el.showModal();
      if (!open && el.open) el.close();
    });
    effect(() => {
      const el = this.focusInput();
      if (el) el.nativeElement.focus();
    });
  }

  respond(accepted: boolean) {
    this.confirm.resolve(accepted);
  }
}
