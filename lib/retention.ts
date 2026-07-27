import { db } from "@/lib/db";

export async function runRetentionCleanup(now=new Date()){
 const days=(value:number)=>new Date(now.getTime()-value*86_400_000);
 const [sessions,loginEvents,challenges,rateLimits,reservations]=await db.$transaction([
  db.session.deleteMany({where:{OR:[{expiresAt:{lt:days(30)}},{revokedAt:{lt:days(30)}}]}}),
  db.loginEvent.deleteMany({where:{createdAt:{lt:days(180)}}}),
  db.emailVerificationChallenge.deleteMany({where:{expiresAt:{lt:days(30)}}}),
  db.rateLimitBucket.deleteMany({where:{resetAt:{lt:days(7)}}}),
  db.couponRedemption.updateMany({where:{status:"RESERVED",expiresAt:{lte:now}},data:{status:"RELEASED",releasedAt:now}})
 ]);
 return {sessions:sessions.count,loginEvents:loginEvents.count,challenges:challenges.count,rateLimits:rateLimits.count,releasedReservations:reservations.count};
}
