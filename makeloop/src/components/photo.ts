const MAX_EDGE = 1600;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_BYTES = 10 * 1024 * 1024;
// Vercel serverless functions reject request bodies over ~4.5 MB.
const UPLOAD_LIMIT = 4 * 1024 * 1024;

export type PreparedPhoto = { blob: Blob; previewUrl: string; blurry: boolean };

export class PhotoError extends Error {}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (!ALLOWED.includes(file.type)) throw new PhotoError("Please use a JPG, PNG or WEBP photo.");
    if (file.size > UPLOAD_LIMIT) throw new PhotoError("That photo is too big. Try taking a new one.");
    return { blob: file, previewUrl: URL.createObjectURL(file), blurry: false };
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blurry = isBlurry(bitmap);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new PhotoError("We couldn't read that photo. Try another one.");
  if (blob.size > UPLOAD_LIMIT) throw new PhotoError("That photo is too big. Try taking a new one.");
  return { blob, previewUrl: URL.createObjectURL(blob), blurry };
}

/** Variance of the Laplacian on a small grayscale copy — low variance means few sharp edges. */
function isBlurry(bitmap: ImageBitmap): boolean {
  const w = 256;
  const h = Math.max(1, Math.round((bitmap.height / bitmap.width) * w));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (!n) return false;
  const mean = sum / n;
  return sumSq / n - mean * mean < 20;
}
