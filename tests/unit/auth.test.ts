import { beforeAll,describe,expect,it } from "vitest";
import { SignJWT } from "jose";
beforeAll(()=>{process.env.JWT_SECRET="test-secret-that-is-at-least-32-characters-long"});
describe("session verification",()=>{
 it("accepts correctly scoped tokens",async()=>{const {verifySessionToken}=await import("@/lib/auth");const key=new TextEncoder().encode(process.env.JWT_SECRET);const token=await new SignJWT({}).setProtectedHeader({alg:"HS256"}).setSubject("user_1").setIssuer("mr-m-academy").setAudience("mr-m-web").setExpirationTime("5m").sign(key);await expect(verifySessionToken(token)).resolves.toBe("user_1")});
 it("rejects tokens for another audience",async()=>{const {verifySessionToken}=await import("@/lib/auth");const key=new TextEncoder().encode(process.env.JWT_SECRET);const token=await new SignJWT({}).setProtectedHeader({alg:"HS256"}).setSubject("user_1").setIssuer("mr-m-academy").setAudience("other").setExpirationTime("5m").sign(key);await expect(verifySessionToken(token)).rejects.toThrow()});
});
