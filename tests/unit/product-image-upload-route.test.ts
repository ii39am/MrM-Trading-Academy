import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
const mocks = vi.hoisted(() => ({ user: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.user }));
vi.mock("@/lib/security", async () => ({ ...await vi.importActual("@/lib/security"), enforceRateLimit: mocks.limit }));
import { POST } from "@/app/api/admin/uploads/product-image/route";
import { GET } from "@/app/media/products/[filename]/route";
import { MAX_PRODUCT_IMAGE_BYTES } from "@/lib/product-image-validation";
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "mrm-image-test-"));
  vi.stubEnv("PRODUCT_IMAGE_DIRECTORY", directory);
  vi.stubEnv("APP_URL", "https://academy.example.test");
  mocks.user.mockResolvedValue({ id: "admin", role: "ADMIN", status: "ACTIVE" });
  mocks.limit.mockResolvedValue({ allowed: true });
});
afterEach(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });
async function file(format: "png" | "jpeg" | "webp" = "png", name = `image.${format}`) {
  const bytes = await sharp({ create: { width: 20, height: 12, channels: 3, background: "purple" } }).toFormat(format).toBuffer();
  return new File([new Uint8Array(bytes)], name, { type: `image/${format}` });
}
function request(image: File, origin = "https://academy.example.test") {
  const body = new FormData(); body.append("image", image);
  return new Request("https://academy.example.test/api/admin/uploads/product-image", { method: "POST", headers: { origin }, body });
}
it("rejects unauthenticated uploads", async () => { mocks.user.mockResolvedValue(null); expect((await POST(request(await file()))).status).toBe(401); expect(await readdir(directory)).toEqual([]); });
it.each(["STUDENT", "SUPPORT"])("rejects non-admin %s", async role => { mocks.user.mockResolvedValue({ role, status: "ACTIVE" }); expect((await POST(request(await file()))).status).toBe(403); });
it("rejects cross-origin uploads", async () => { expect((await POST(request(await file(), "https://evil.test"))).status).toBe(403); });
it("rate limits an admin", async () => { mocks.limit.mockResolvedValue({ allowed: false }); expect((await POST(request(await file()))).status).toBe(429); });
it.each(["png", "jpeg", "webp"] as const)("accepts real %s and serves a permanent public WebP URL", async format => {
  const response = await POST(request(await file(format)));
  expect(response.status).toBe(201); expect(response.headers.get("cache-control")).toBe("no-store");
  const result = await response.json(); expect(Object.keys(result)).toEqual(["url"]);
  expect(result.url).toMatch(/^https:\/\/academy\.example\.test\/media\/products\/[a-f0-9-]+\.webp$/);
  const filename = new URL(result.url).pathname.split("/").pop()!;
  const served = await GET(new Request(result.url), { params: Promise.resolve({ filename }) });
  expect(served.status).toBe(200); expect(served.headers.get("content-type")).toBe("image/webp");
  expect(served.headers.get("x-content-type-options")).toBe("nosniff");
  expect((await sharp(Buffer.from(await served.arrayBuffer())).metadata()).format).toBe("webp");
});
it("rejects a file over 5 MB", async () => {
  const response = await POST(request(new File([new Uint8Array(MAX_PRODUCT_IMAGE_BYTES + 1)], "large.png", { type: "image/png" })));
  expect(response.status).toBe(413); expect(await readdir(directory)).toEqual([]);
});
it("bounds a chunked body without Content-Length before parsing", async () => {
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_PRODUCT_IMAGE_BYTES + 65537)); controller.close(); } });
  const req = new Request("https://academy.example.test", { method: "POST", headers: { origin: "https://academy.example.test", "content-type": "multipart/form-data; boundary=test" }, body, duplex: "half" } as RequestInit);
  expect((await POST(req)).status).toBe(413);
});
it.each(["image/svg+xml", "application/x-php", "image/gif"])("rejects unsupported MIME %s", async type => { expect((await POST(request(new File(["bad"], "image.png", { type })))).status).toBe(400); });
it("rejects an executable extension even with image MIME", async () => { expect((await POST(request(await file("png", "image.php")))).status).toBe(400); });
it("rejects disguised SVG and corrupt pixels", async () => { expect((await POST(request(new File(["<svg></svg>"], "image.png", { type: "image/png" })))).status).toBe(400); });
it("rejects MIME that disagrees with actual image bytes", async () => {
  const jpeg = await file("jpeg");
  expect((await POST(request(new File([await jpeg.arrayBuffer()], "image.png", { type: "image/png" })))).status).toBe(400);
});
it("rejects truncated image data even with a correct signature", async () => {
  const png = Buffer.from(await (await file()).arrayBuffer());
  expect((await POST(request(new File([new Uint8Array(png.subarray(0, 40))], "image.png", { type: "image/png" })))).status).toBe(400);
});
it("rejects excessive decoded dimensions", async () => {
  const bytes = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: "black" } }).png().toBuffer();
  expect((await POST(request(new File([new Uint8Array(bytes)], "large.png", { type: "image/png" })))).status).toBe(400);
});
it("rejects extra multipart fields", async () => {
  const body = new FormData(); body.append("image", await file()); body.append("path", "../outside");
  expect((await POST(new Request("https://academy.example.test", { method: "POST", headers: { origin: "https://academy.example.test" }, body }))).status).toBe(400);
});
it("does not trust the filename or overwrite existing files", async () => {
  const image = await file("png", "../../outside.png");
  const first = await (await POST(request(image))).json();
  const second = await (await POST(request(image))).json();
  expect(first.url).not.toBe(second.url);
  expect((await readdir(directory))).toHaveLength(2);
  expect((await readdir(directory)).every(name => /^[a-f0-9-]+\.webp$/.test(name))).toBe(true);
});
it.each(["../private", "%2e%2e%2fsecret", "image.svg"])("rejects media path traversal %s", async filename => { expect((await GET(new Request("https://academy.example.test"), { params: Promise.resolve({ filename }) })).status).toBe(404); });
it("rejects malformed multipart", async () => { expect((await POST(new Request("https://academy.example.test", { method: "POST", headers: { origin: "https://academy.example.test", "content-type": "multipart/form-data; boundary=bad" }, body: "bad" }))).status).toBe(400); });
it("fails closed on missing storage without exposing paths", async () => {
  vi.stubEnv("PRODUCT_IMAGE_DIRECTORY", "");
  const result = await POST(request(await file())); expect(result.status).toBe(503); expect(JSON.stringify(await result.json())).not.toContain(directory);
});
it("requires HTTPS for generated URLs", async () => { vi.stubEnv("APP_URL", "http://localhost:3000"); expect((await POST(request(await file(), "http://localhost:3000"))).status).toBe(503); });
