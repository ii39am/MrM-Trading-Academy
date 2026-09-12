import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { enforceRateLimit, verifySameOrigin } from "@/lib/security";
import { MAX_PRODUCT_IMAGE_BYTES } from "@/lib/product-image-validation";
import { ProductImageError, storeProductImage } from "@/lib/product-image-storage";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const error = (code: string, message: string, status: number) => Response.json({ error: { code, message } }, { status, headers });

export async function POST(request: Request) {
  try {
    if (!verifySameOrigin(request)) return error("CSRF_REJECTED", "Request origin rejected.", 403);
    const user = await getSessionUser();
    if (!user) return error("UNAUTHORIZED", "Please sign in again.", 401);
    if (!isAdmin(user)) return error("FORBIDDEN", "Administrator access is required.", 403);
    const limit = await enforceRateLimit(`product-image:${user.id}`, 30, 60 * 60 * 1000);
    if (!limit.allowed) return error("RATE_LIMITED", "Too many uploads. Please try again later.", 429);
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) return error("INVALID_IMAGE", "Choose a PNG, JPG or WEBP image.", 400);
    // Bound the actual stream before multipart parsing, including requests without Content-Length.
    const maxRequest = MAX_PRODUCT_IMAGE_BYTES + 64 * 1024;
    if (Number(request.headers.get("content-length")) > maxRequest) throw new ProductImageError("IMAGE_TOO_LARGE");
    const reader = request.body?.getReader();
    if (!reader) throw new ProductImageError("INVALID_IMAGE");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxRequest) { await reader.cancel(); throw new ProductImageError("IMAGE_TOO_LARGE"); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    let data: FormData;
    try {
      data = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
    } catch { throw new ProductImageError("INVALID_IMAGE"); }
    const file = data.get("image");
    if (!(file instanceof File) || [...data.keys()].length !== 1) throw new ProductImageError("INVALID_IMAGE");
    return Response.json({ url: await storeProductImage(file) }, { status: 201, headers });
  } catch (cause) {
    if (cause instanceof ProductImageError) return error(cause.code,
      cause.code === "IMAGE_TOO_LARGE" ? "Choose an image no larger than 5 MB." : "Choose a valid, non-animated PNG, JPG or WEBP image (up to 16 megapixels).",
      cause.code === "IMAGE_TOO_LARGE" ? 413 : 400);
    return error("UPLOAD_UNAVAILABLE", "Image upload is unavailable. Please try again later.", 503);
  }
}
