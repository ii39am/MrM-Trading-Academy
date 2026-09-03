const LOCAL_APP_ORIGIN = "http://localhost:3000";

/**
 * Returns the configured public application origin without consulting request
 * headers. This prevents an internal reverse-proxy origin from leaking into
 * redirects and avoids trusting spoofable Host/X-Forwarded-* values.
 */
export function getAppOrigin() {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!configured) {
    if (process.env.NODE_ENV === "production")
      throw new Error("APP_URL is required in production");
    return LOCAL_APP_ORIGIN;
  }

  try {
    const url = new URL(configured);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    )
      throw new Error("Unsupported application URL");
    return url.origin;
  } catch {
    throw new Error("APP_URL must be a valid HTTP(S) URL");
  }
}

export function appUrl(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\"))
    throw new Error("Application URL path must be root-relative");
  return new URL(path, `${getAppOrigin()}/`);
}
