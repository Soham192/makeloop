import { put, del } from "@vercel/blob";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/shared/ai";
import { HttpError } from "./http";

type ImageKind = "jpeg" | "png" | "webp";

export function sniffImage(bytes: Uint8Array): ImageKind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}

export async function validateImage(file: unknown): Promise<{ bytes: Uint8Array; kind: ImageKind }> {
  if (!(file instanceof Blob) || file.size === 0) throw new HttpError(400, "Please add a photo of your build");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "That photo is too big — it must be under 10 MB");
  if (file.type && !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new HttpError(415, "Photos must be JPG, PNG or WEBP");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) throw new HttpError(415, "Photos must be JPG, PNG or WEBP");
  return { bytes, kind };
}

export async function storeImage(bytes: Uint8Array, kind: ImageKind, pathPrefix: string): Promise<string> {
  const contentType = `image/${kind}`;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Local dev without Blob: keep the image inline so the loop still works end to end.
    return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
  }
  const blob = await put(`${pathPrefix}.${kind === "jpeg" ? "jpg" : kind}`, Buffer.from(bytes), {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}

export async function deleteImages(urls: (string | null)[]) {
  const remote = urls.filter((u): u is string => !!u && u.startsWith("https://"));
  if (remote.length && process.env.BLOB_READ_WRITE_TOKEN) await del(remote);
}
