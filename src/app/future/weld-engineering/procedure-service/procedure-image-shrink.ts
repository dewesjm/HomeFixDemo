/* Shrinks an uploaded image before it's stored: at most MAX_SIDE pixels on its longer side, saved as
   a JPEG on a white background (transparent parts of a PNG come out white). Keeps the demo's browser
   storage from filling up; a real file store would keep the original. Uses only an <img> and a canvas. */
const MAX_SIDE = 1000;
const QUALITY = 0.8;

export interface ShrunkImage { contentType: 'image/jpeg'; base64: string; width: number; height: number; }

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('not an image'));
    img.src = dataUrl;
  });
}

/* rejects when the file can't be read as an image */
export async function shrinkImage(contentType: string, base64: string): Promise<ShrunkImage> {
  const img = await loadImage(`data:${contentType};base64,${base64}`);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const out = canvas.toDataURL('image/jpeg', QUALITY);
  return { contentType: 'image/jpeg', base64: out.slice(out.indexOf(',') + 1), width, height };
}
