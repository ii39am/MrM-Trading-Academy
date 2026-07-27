import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { afterAll,beforeAll,describe,expect,it } from "vitest";
import { db } from "@/lib/db";
import { normalizeEmail,registerWithEmailChallenge } from "@/lib/email-challenges";
import { registerEmailProvider,type EmailProvider } from "@/lib/email";
import { TestEmailProvider } from "@/lib/providers/test-email";
import { userRepository } from "@/lib/user-repository";

const prefix=`auth-${randomUUID()}`;
beforeAll(()=>{process.env.E2E_EMAIL_CODE="246810";registerEmailProvider(new TestEmailProvider())});
afterAll(async()=>{await db.user.deleteMany({where:{normalizedEmail:{startsWith:prefix}}});await db.$disconnect()});
describe("email account invariants",()=>{
 it("normalizes case and whitespace",()=>expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com"));
 it("prevents concurrent duplicate accounts",async()=>{
  const email=`${prefix}-duplicate@example.test`,hash=await bcrypt.hash("SecurePass123",12);
  await Promise.allSettled([registerWithEmailChallenge("First",email,hash),registerWithEmailChallenge("Second",email,hash)]);
  expect(await db.user.count({where:{normalizedEmail:email}})).toBe(1);
 });
 it("rejects disabled accounts and locks repeated failures",async()=>{
  const email=`${prefix}-disabled@example.test`,passwordHash=await bcrypt.hash("SecurePass123",12);
  await db.user.create({data:{name:"Disabled",email,normalizedEmail:email,passwordHash,emailVerifiedAt:new Date(),status:"DISABLED"}});
  expect((await userRepository.authenticate(email,"SecurePass123")).reason).toBe("INVALID");
  const lockEmail=`${prefix}-lock@example.test`;
  await db.user.create({data:{name:"Lock",email:lockEmail,normalizedEmail:lockEmail,passwordHash,emailVerifiedAt:new Date(),status:"ACTIVE"}});
  for(let index=0;index<5;index++)await userRepository.authenticate(lockEmail,"WrongPassword1");
  expect((await db.user.findUniqueOrThrow({where:{normalizedEmail:lockEmail}})).lockedUntil).not.toBeNull();
 expect((await userRepository.authenticate(lockEmail,"SecurePass123")).reason).toBe("LOCKED");
 });
 it("records the successful login time without exposing the password hash",async()=>{
  const email=`${prefix}-login@example.test`,passwordHash=await bcrypt.hash("SecurePass123",12);
  await db.user.create({data:{name:"Login",email,normalizedEmail:email,passwordHash,emailVerifiedAt:new Date(),status:"ACTIVE"}});
  const result=await userRepository.authenticate(email,"SecurePass123");expect(result.reason).toBe("OK");
  const stored=await db.user.findUniqueOrThrow({where:{normalizedEmail:email},select:{lastLoginAt:true,passwordHash:true}});
  expect(stored.lastLoginAt).toBeInstanceOf(Date);expect(stored.passwordHash).not.toBe("SecurePass123");
 });
 it("invalidates a challenge when delivery fails",async()=>{
  const failing:EmailProvider={name:"failing",send:async()=>{throw new Error("provider unavailable")}};registerEmailProvider(failing);
  const email=`${prefix}-failure@example.test`,user=await db.user.create({data:{name:"Failure",email,normalizedEmail:email,passwordHash:"x"}});
  const {issueEmailChallenge}=await import("@/lib/email-challenges");
  await expect(issueEmailChallenge(user.id,email,"EMAIL_VERIFICATION")).rejects.toThrow();
  expect((await db.emailVerificationChallenge.findFirstOrThrow({where:{userId:user.id}})).invalidatedAt).not.toBeNull();
  registerEmailProvider(new TestEmailProvider());
 });
});
