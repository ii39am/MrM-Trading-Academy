import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getAppOrigin } from "@/lib/app-url";
import { productImageError } from "@/lib/product-image-validation";

export class ProductImageError extends Error {
  constructor(public code: "IMAGE_TOO_LARGE" | "INVALID_IMAGE") { super(code); }
}

export const productImageFilename = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.webp$/;

function directory() {
  const configured = process.env.PRODUCT_IMAGE_DIRECTORY;
  // No working-directory fallback: standalone releases must never own persistent media.
  if (!configured || !path.isAbsolute(configured)) throw new Error("Media storage is not configured");
  const resolved = path.resolve(configured);
  if (resolved.split(path.sep).includes(".next")) throw new Error("Invalid media storage location");
  return resolved;
}

export async function storeProductImage(file: File) {
  const validation = productImageError(file);
  if (validation) throw new ProductImageError(validation);
  const origin = getAppOrigin();
  if (!origin.startsWith("https://")) throw new Error("Media requires an HTTPS application origin");
  const destination = directory();
  let image: Buffer;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const signatureMatches = file.type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) :
      file.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
        bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!signatureMatches) throw new Error("Unsupported image");
    const input = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "warning" });
    const metadata = await input.metadata();
    const expected = { "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp" }[file.type];
    if (metadata.format !== expected || (metadata.pages ?? 1) !== 1) throw new Error("Unsupported image");
    // Decode pixels, strip metadata/trailing payloads, normalize orientation, bound output size.
    image = await input.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch {
    throw new ProductImageError("INVALID_IMAGE");
  }
  await mkdir(destination, { recursive: true, mode: 0o750 });
  const filename = `${randomUUID()}.webp`;
  await writeFile(path.join(destination, filename), image, { flag: "wx", mode: 0o640 });
  return new URL(`/media/products/${filename}`, origin).href;
}

export async function readProductImage(filename: string) {
  if (!productImageFilename.test(filename)) return null;
  try { return await readFile(path.join(directory(), filename)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
