const unsafePathCharacters = /[\\\u0000-\u001f\u007f]/;

/** Accepts only a same-origin, root-relative return path. */
export function safeNextPath(value: string | null, fallback = "/dashboard") {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    unsafePathCharacters.test(value)
  )
    return fallback;
  return value;
}
