import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucidePaperclip, LucideFile, LucideTrash2 } from '@lucide/angular';

export interface Attachment {
  id: string;
  name: string;
  addedBy: string;
  addedAt: string;
}

@Component({
  selector: 'app-attachments',
  standalone: true,
  imports: [CommonModule, LucidePaperclip, LucideFile, LucideTrash2],
  templateUrl: './attachments.component.html'
})
export class AttachmentsComponent {
  attachments = input.required<Attachment[]>();
  disabled = input<boolean>(false);
  add = output<FileList>();
  remove = output<string>();
}
