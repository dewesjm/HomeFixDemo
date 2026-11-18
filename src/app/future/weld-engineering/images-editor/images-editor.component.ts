/* Edits an images field on a procedure: a picture per image with its caption, move and remove
   buttons, and Add Images. Picked files go through the image service's uploadProcedureImage (which
   shrinks them) and their ids are added to the value it's given, changed in place. */
import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideArrowLeft, LucideArrowRight, LucidePlus, LucideX } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { MAX_IMAGES_PER_FIELD, type ExtraField, type ImagesValue } from '../procedure-sections';
import { imageDataUrl, uploadProcedureImage, IMAGE_TYPES } from '../procedure-service/procedure-image-service';

function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

@Component({
  selector: 'app-procedure-images-editor',
  standalone: true,
  imports: [FormsModule, LucideArrowLeft, LucideArrowRight, LucidePlus, LucideX],
  templateUrl: './images-editor.component.html'
})
export class ProcedureImagesEditorComponent {
  private toast = inject(ToastService);

  field = input.required<ExtraField>();
  value = input.required<ImagesValue>();

  max = MAX_IMAGES_PER_FIELD;
  accept = IMAGE_TYPES.join(',');
  uploading = signal(false);
  /* data: URLs already read, by image id */
  private urls = new Map<string, string | null>();

  url(id: string): string | null {
    if (!this.urls.has(id)) this.urls.set(id, imageDataUrl(id));
    return this.urls.get(id) ?? null;
  }

  async add(picker: HTMLInputElement) {
    const files = Array.from(picker.files ?? []);
    picker.value = '';
    const room = this.max - this.value().images.length;
    if (files.length > room) {
      this.toast.add({ severity: 'warn', summary: 'Too many images', detail: `${this.field().label} holds at most ${this.max} images.` });
    }
    this.uploading.set(true);
    for (const file of files.slice(0, Math.max(0, room))) {
      let base64: string;
      try {
        base64 = await fileBase64(file);
      } catch {
        this.toast.add({ severity: 'warn', summary: 'Image not added', detail: `${file.name} couldn't be read.` });
        continue;
      }
      const r = await uploadProcedureImage({ fileName: file.name, contentType: file.type, base64 });
      if (!r.ok) {
        this.toast.add({ severity: 'warn', summary: r.title, detail: r.error });
        continue;
      }
      this.value().images.push({ id: r.data.id, name: r.data.name, caption: '' });
    }
    this.uploading.set(false);
  }

  remove(i: number) {
    this.value().images.splice(i, 1);
  }

  shift(i: number, delta: number) {
    const list = this.value().images;
    const to = i + delta;
    if (to < 0 || to >= list.length) return;
    const [img] = list.splice(i, 1);
    list.splice(to, 0, img);
  }
}
