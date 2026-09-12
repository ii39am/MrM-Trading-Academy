import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
const actor = vi.hoisted(() => ({ user: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUser: actor.user }));
import { POST as upload } from "@/app/api/admin/uploads/product-image/route";
import { POST as create } from "@/app/api/admin/products/route";
import { PATCH as update } from "@/app/api/admin/products/[id]/route";
const id = `media-${randomUUID()}`;
let directory: string, courseId: string;
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "mrm-media-db-test-"));
  vi.stubEnv("PRODUCT_IMAGE_DIRECTORY", directory); vi.stubEnv("APP_URL", "https://academy.example.test");
  await db.user.create({ data: { id, name: "Media admin", email: `${id}@example.test`, normalizedEmail: `${id}@example.test`, passwordHash: "unused", role: "ADMIN", status: "ACTIVE" } });
  actor.user.mockResolvedValue({ id, role: "ADMIN", status: "ACTIVE" });
});
afterAll(async () => {
  if (courseId) await db.course.delete({ where: { id: courseId } });
  await db.securityAuditLog.deleteMany({ where: { actorId: id } });
  await db.rateLimitBucket.deleteMany({ where: { key: `product-image:${id}` } });
  await db.user.deleteMany({ where: { id } });
  await db.$disconnect(); vi.unstubAllEnvs();
  if (directory) await rm(directory, { recursive: true, force: true });
});
const payload = { slug: id, titleEn: "Media course", titleAr: "دورة", shortDescriptionEn: "A fixture course description", shortDescriptionAr: "وصف الدورة للاختبار", fullDescriptionEn: "A complete course description for testing media storage", fullDescriptionAr: "وصف كامل للدورة لاختبار تخزين الصور", instructor: "Fixture", priceCents: 1500, currency: "USD", image: "https://images.unsplash.com/legacy", accent: "#7C3AED", telegramChatId: "", telegramAccessEnabled: false, published: false };
function request(body: unknown) { return new Request("https://academy.example.test/api/admin/products", { method: "POST", headers: { origin: "https://academy.example.test", "content-type": "application/json" }, body: JSON.stringify(body) }); }
it("preserves a legacy image then persists an uploaded URL without deleting either on a rejected empty save", async () => {
  const created = await create(request(payload)); expect(created.status).toBe(201); courseId = (await created.json()).product.id;
  expect((await db.course.findUniqueOrThrow({ where: { id: courseId } })).image).toBe(payload.image);
  const bytes = await sharp({ create: { width: 12, height: 12, channels: 3, background: "purple" } }).png().toBuffer();
  const form = new FormData(); form.append("image", new File([new Uint8Array(bytes)], "fixture.png", { type: "image/png" }));
  const uploaded = await upload(new Request("https://academy.example.test/api/admin/uploads/product-image", { method: "POST", headers: { origin: "https://academy.example.test" }, body: form }));
  expect(uploaded.status).toBe(201); const { url } = await uploaded.json();
  const params = { params: Promise.resolve({ id: courseId }) };
  expect((await update(request({ ...payload, image: url }), params)).status).toBe(200);
  expect((await db.course.findUniqueOrThrow({ where: { id: courseId } })).image).toBe(url);
  expect((await update(request({ ...payload, image: "" }), params)).status).toBe(400);
  expect((await db.course.findUniqueOrThrow({ where: { id: courseId } })).image).toBe(url);
  expect(await readdir(directory)).toHaveLength(1);
});
