/* Weld Engineering's procedure image calls. An images field (procedure-sections.ts) holds only
   references { id, name, caption }; reads answer those, and the file itself is fetched separately:
     uploadProcedureImage(file)  = stores an image (shrunk first) and answers its id; a write then puts
                                   the id in an images field (updateProcedureFields or the edit form)
     getProcedureImage(id)       = one image file, as { fileName, contentType, base64 }
   An uploaded image no procedure refers to is removed the next time the app loads, or after a later
   save once it was uploaded before this page load. Files are in data/procedure-images.ts. */
import { procedures } from '../../../data/procedures';
import { loadImage, removeImage, saveImage, storedImageIds } from '../../../data/procedure-images';
import type { DownloadFile } from '../../../shared/download-file';
import { isImages } from '../procedure-field-values';
import { shrinkImage } from './procedure-image-shrink';
import { fail, type ServiceResult } from './service-result';

export interface ImageUpload { fileName: string; contentType: string; base64: string; }
export interface UploadedImage { id: string; name: string; contentType: string; width: number; height: number; }

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
/* the largest file accepted before shrinking, in bytes */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/* uploaded during this page load and maybe not saved on a procedure yet, so never removed as unused */
const uploadedNow = new Set<string>();

const text = (v: unknown) => (typeof v === 'string' ? v : '');

/* every image id an images field refers to, on any procedure (ticked section or not) */
function referencedIds(): Set<string> {
  return new Set(procedures().flatMap(p => Object.values(p.extraFields).flatMap(v => isImages(v) ? v.images.map(i => i.id) : [])));
}

/* removes stored images no procedure refers to, except ones uploaded during this page load */
export function removeUnusedImages(): void {
  const used = referencedIds();
  for (const id of storedImageIds()) {
    if (!used.has(id) && !uploadedNow.has(id)) removeImage(id);
  }
}

export function imageExists(id: string): boolean {
  return loadImage(id) !== null;
}

export function imageName(id: string): string {
  return loadImage(id)?.name ?? '';
}

/* an image as a data: URL, for the PDF and thumbnails; null when there is no such image */
export function imageDataUrl(id: string): string | null {
  const img = loadImage(id);
  return img ? `data:${img.contentType};base64,${img.base64}` : null;
}

/* Stores an image: PNG, JPEG, GIF or WebP, at most 15 MB, shrunk to at most 1000 pixels a side and
   saved as a JPEG (the name ends .jpg). Answers the new id to put in an images field. Answers later; never rejects. */
export async function uploadProcedureImage(file: ImageUpload): Promise<ServiceResult<UploadedImage>> {
  const name = text(file?.fileName).trim();
  const contentType = text(file?.contentType).trim().toLowerCase();
  const base64 = text(file?.base64).replace(/\s/g, '');
  if (!name) return fail('Send the image\'s fileName.', 'Image not added');
  if (!IMAGE_TYPES.includes(contentType)) return fail(`The image must be one of ${IMAGE_TYPES.join(', ')}.`, 'Image not added');
  if (!base64) return fail('Send the image file, base64 encoded.', 'Image not added');
  if (base64.length * 0.75 > MAX_UPLOAD_BYTES) return fail('The image is larger than 15 MB.', 'Image not added');
  let shrunk;
  try {
    shrunk = await shrinkImage(contentType, base64);
  } catch {
    return fail(`${name} couldn't be read as an image.`, 'Image not added');
  }
  const id = `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const stored = `${name.replace(/\.[^.]+$/, '')}.jpg`;
  if (!saveImage(id, { name: stored, contentType: shrunk.contentType, base64: shrunk.base64 })) {
    return fail('The browser storage is full. Remove some images and try again.', 'Image not added');
  }
  uploadedNow.add(id);
  return { ok: true, data: { id, name: stored, contentType: shrunk.contentType, width: shrunk.width, height: shrunk.height } };
}

export function getProcedureImage(id: string): ServiceResult<DownloadFile> {
  const img = loadImage(text(id).trim());
  if (!img) return fail(`There is no image with id ${text(id).trim() || '(blank)'}.`, 'Not found');
  return { ok: true, data: { fileName: img.name, contentType: img.contentType, base64: img.base64 } };
}

removeUnusedImages();
