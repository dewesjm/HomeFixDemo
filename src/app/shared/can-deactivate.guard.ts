import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { ConfirmService } from './confirm.service';

export interface CanComponentDeactivate {
  canDeactivate(): boolean | Promise<boolean>;
}

export const canDeactivateGuard: CanDeactivateFn<CanComponentDeactivate> = (component) => {
  if (component.canDeactivate()) return true;
  const confirm = inject(ConfirmService);
  return new Promise<boolean>(resolve => {
    confirm.confirm({
      header: 'Unsaved changes',
      message: 'You have unsaved signoff data. Are you sure you want to leave?',
      acceptLabel: 'Leave',
      rejectLabel: 'Stay',
      password: false,
      accept: () => resolve(true),
      reject: () => resolve(false),
    });
  });
};
