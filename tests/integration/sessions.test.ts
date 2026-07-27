import { randomUUID } from "node:crypto";
import { afterAll,beforeAll,describe,expect,it } from "vitest";
import { db } from "@/lib/db";
import { listActiveSessions,revokeOtherSessions,revokeOwnedSession } from "@/lib/session-management";
const suffix=randomUUID(),owner=`session-owner-${suffix}`,other=`session-other-${suffix}`,current=`current-${suffix}`,otherSession=`other-${suffix}`,foreign=`foreign-${suffix}`;
beforeAll(async()=>{await db.user.createMany({data:[{id:owner,name:"Owner",email:`${owner}@example.test`,normalizedEmail:`${owner}@example.test`,passwordHash:"x"},{id:other,name:"Other",email:`${other}@example.test`,normalizedEmail:`${other}@example.test`,passwordHash:"x"}]});await db.session.createMany({data:[{id:current,publicId:`public-${current}`,userId:owner,expiresAt:new Date(Date.now()+60000)},{id:otherSession,publicId:`public-${otherSession}`,userId:owner,expiresAt:new Date(Date.now()+60000)},{id:foreign,publicId:`public-${foreign}`,userId:other,expiresAt:new Date(Date.now()+60000)}]})});
afterAll(async()=>{await db.user.deleteMany({where:{id:{in:[owner,other]}}});await db.$disconnect()});
describe("session ownership",()=>{
 it("lists only the current user's active sessions without hashes",async()=>{const sessions=await listActiveSessions(owner,current);expect(sessions).toHaveLength(2);expect(sessions.some(x=>x.isCurrentSession)).toBe(true);for(const session of sessions){expect(session).not.toHaveProperty("id");expect(session).not.toHaveProperty("tokenHash")}});
 it("cannot revoke another user's session",async()=>expect(await revokeOwnedSession(owner,`public-${foreign}`)).toBeNull());
 it("revokes one owned session",async()=>expect(await revokeOwnedSession(owner,`public-${otherSession}`)).toBe(otherSession));
 it("revoke others preserves the current session",async()=>{await db.session.update({where:{id:otherSession},data:{revokedAt:null}});await revokeOtherSessions(owner,current);expect((await db.session.findUniqueOrThrow({where:{id:current}})).revokedAt).toBeNull();expect((await db.session.findUniqueOrThrow({where:{id:otherSession}})).revokedAt).not.toBeNull()});
});
