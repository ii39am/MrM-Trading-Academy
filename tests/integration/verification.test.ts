import { randomUUID } from "node:crypto";
import { afterAll,beforeAll,beforeEach,describe,expect,it } from "vitest";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { consumeEmailChallenge,issueEmailChallenge,resetPasswordWithChallenge } from "@/lib/email-challenges";
import { registerEmailProvider } from "@/lib/email";
import { TestEmailProvider } from "@/lib/providers/test-email";
const id=`verify-${randomUUID()}`,email=`verify-${randomUUID()}@example.test`;
beforeAll(async()=>{process.env.E2E_EMAIL_CODE="246810";registerEmailProvider(new TestEmailProvider());await db.user.create({data:{id,name:"Verify Test",email,normalizedEmail:email,passwordHash:"x"}})});
beforeEach(async()=>{await db.emailVerificationChallenge.deleteMany({where:{userId:id}})});
afterAll(async()=>{await db.user.delete({where:{id}});await db.$disconnect()});
describe("email verification controls",()=>{
 it("rejects invalid, accepts valid, and prevents reuse",async()=>{await issueEmailChallenge(id,email,"EMAIL_VERIFICATION");expect(await consumeEmailChallenge(email,"EMAIL_VERIFICATION","111111")).toBeNull();expect(await consumeEmailChallenge(email,"EMAIL_VERIFICATION","246810")).not.toBeNull();expect(await consumeEmailChallenge(email,"EMAIL_VERIFICATION","246810")).toBeNull()});
 it("enforces resend cooldown",async()=>{await issueEmailChallenge(id,email,"PASSWORD_RESET");await expect(issueEmailChallenge(id,email,"PASSWORD_RESET")).rejects.toThrow("RESEND_COOLDOWN")});
 it("rejects expired challenges",async()=>{await db.emailVerificationChallenge.create({data:{userId:id,email,purpose:"EMAIL_CHANGE",codeHash:"00",expiresAt:new Date(Date.now()-1000)}});expect(await consumeEmailChallenge(email,"EMAIL_CHANGE","246810")).toBeNull()});
 it("blocks excessive attempts",async()=>{await issueEmailChallenge(id,email,"EMAIL_CHANGE");for(let index=0;index<5;index++)expect(await consumeEmailChallenge(email,"EMAIL_CHANGE","111111")).toBeNull();expect(await consumeEmailChallenge(email,"EMAIL_CHANGE","246810")).toBeNull()});
 it("resets a password once and revokes existing sessions",async()=>{await issueEmailChallenge(id,email,"PASSWORD_RESET");await db.session.create({data:{id:`session-${randomUUID()}`,userId:id,expiresAt:new Date(Date.now()+60_000)}});const passwordHash=await bcrypt.hash("Replacement123",12);expect(await resetPasswordWithChallenge(email,"246810",passwordHash)).toBe(id);expect(await resetPasswordWithChallenge(email,"246810",passwordHash)).toBeNull();expect(await db.session.count({where:{userId:id,revokedAt:null}})).toBe(0);expect(await bcrypt.compare("Replacement123",(await db.user.findUniqueOrThrow({where:{id},select:{passwordHash:true}})).passwordHash)).toBe(true)});
});
