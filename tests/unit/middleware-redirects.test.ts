import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

const secret = "production-test-secret-with-at-least-thirty-two-characters";
const original = { ...process.env };

async function sessionToken(expiration: string | number = "5m") {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("mr-m-academy")
    .setAudience("mr-m-web")
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(new TextEncoder().encode(secret));
}

function request(path: string, token?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: token ? { cookie: `mr_m_session=${token}` } : undefined,
  });
}

describe("protected-route middleware redirects", () => {
  beforeEach(() => {
    Object.assign(process.env, {
      NODE_ENV: "production",
      APP_URL: "https://mrmetradingacademy.com",
      NEXT_PUBLIC_APP_URL: "https://mrmetradingacademy.com",
      JWT_SECRET: secret,
    });
  });

  afterEach(() => {
    for (const key of Object.keys(process.env))
      if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  });

  it("redirects unauthenticated admin requests to the configured production origin", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://incorrect-public.example";
    const response = await middleware(
      new NextRequest("http://localhost:3000/admin", {
        headers: {
          host: "internal-vps:3000",
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "http",
        },
      }),
    );
    expect(response.headers.get("location")).toBe(
      "https://mrmetradingacademy.com/login?next=%2Fadmin",
    );
    expect(response.headers.get("location")).not.toContain("localhost");
  });

  it("redirects unauthenticated dashboard requests and preserves the pathname", async () => {
    const response = await middleware(request("/dashboard/purchases/purchase-1"));
    expect(response.headers.get("location")).toBe(
      "https://mrmetradingacademy.com/login?next=%2Fdashboard%2Fpurchases%2Fpurchase-1",
    );
  });

  it("clears invalid or expired sessions and preserves the protected pathname", async () => {
    const invalid = await middleware(request("/account/security", "invalid-token"));
    expect(invalid.headers.get("location")).toBe(
      "https://mrmetradingacademy.com/login?next=%2Faccount%2Fsecurity",
    );
    expect(invalid.headers.get("set-cookie")).toContain("mr_m_session=");

    const expiredToken = await sessionToken(Math.floor(Date.now() / 1000) - 60);
    const expired = await middleware(request("/admin/sales", expiredToken));
    expect(expired.headers.get("location")).toBe(
      "https://mrmetradingacademy.com/login?next=%2Fadmin%2Fsales",
    );
  });

  it("allows a cryptographically valid session to continue", async () => {
    const response = await middleware(request("/admin", await sessionToken()));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not allow a request query to control the redirect destination", async () => {
    const response = await middleware(
      request("/admin?next=https%3A%2F%2Fevil.example%2Fsteal"),
    );
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("https://mrmetradingacademy.com");
    expect(location.searchParams.get("next")).toBe("/admin");
    expect(location.href).not.toContain("evil.example");
  });

  it("uses the configured localhost origin during local development", async () => {
    Object.assign(process.env, {
      NODE_ENV: "development",
      APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
    const response = await middleware(
      new NextRequest("http://127.0.0.1:3000/dashboard"),
    );
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fdashboard",
    );
  });
});
