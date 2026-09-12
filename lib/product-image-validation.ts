export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export function productImageError(file: { size: number; type: string; name: string }) {
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) return "IMAGE_TOO_LARGE";
  const extension = file.name.split(".").pop()?.toLowerCase();
  const matches = (file.type === "image/png" && extension === "png") ||
    (file.type === "image/jpeg" && (extension === "jpg" || extension === "jpeg")) ||
    (file.type === "image/webp" && extension === "webp");
  if (!matches || !file.size) return "INVALID_IMAGE";
  return null;
}
