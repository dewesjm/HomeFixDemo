/* Weld Engineering's stored procedure images: the files an images field (procedure-sections.ts)
   refers to by id. Each image is its own localStorage key, so one large image never rewrites the
   others and a full storage only refuses that one image. In real life these would be in a file
   store and the procedure would keep the link. Only the image service
   (future/weld-engineering/procedure-service/procedure-image-service.ts) reads or writes them. */
import { STORAGE } from './storage-keys';

export interface StoredImage {
  name: string;
  contentType: string;
  /* the image file, base64 encoded */
  base64: string;
}

const keyOf = (id: string) => STORAGE.procedureImagePrefix + id;

export function loadImage(id: string): StoredImage | null {
  try {
    const raw = localStorage.getItem(keyOf(id));
    return raw ? JSON.parse(raw) as StoredImage : null;
  } catch {
    return null;
  }
}

/* false when the browser storage is full */
export function saveImage(id: string, image: StoredImage): boolean {
  try {
    localStorage.setItem(keyOf(id), JSON.stringify(image));
    return true;
  } catch {
    return false;
  }
}

export function removeImage(id: string): void {
  try { localStorage.removeItem(keyOf(id)); } catch { /* ignore */ }
}

export function storedImageIds(): string[] {
  try {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(STORAGE.procedureImagePrefix)) ids.push(k.slice(STORAGE.procedureImagePrefix.length));
    }
    return ids;
  } catch {
    return [];
  }
}
