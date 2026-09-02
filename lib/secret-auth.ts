import { createHash, timingSafeEqual } from "node:crypto";

export function secureSecretEqual(supplied: string | null, expected: string) {
  if (!supplied) return false;
  const left = createHash("sha256").update(supplied).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}
