import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucidePaperclip, LucideFile, LucideTrash2 } from '@lucide/angular';
import { AppDateTimePipe } from '../../shared/date-format';
import { Reference } from '../model/workflow-types';

@Component({
  selector: 'app-references',
  standalone: true,
  imports: [AppDateTimePipe, CommonModule, LucidePaperclip, LucideFile, LucideTrash2],
  templateUrl: './references.component.html'
})
export class ReferencesComponent {
  references = input.required<Reference[]>();
  disabled = input<boolean>(false);
  /* drawn as a box inside the sign-off form rather than as a panel of its own */
  card = input<boolean>(false);
  add = output<FileList>();
  remove = output<string>();
}
