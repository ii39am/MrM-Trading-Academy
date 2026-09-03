import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";

export function clientKey(request:Request,scope:string){
 const trusted=process.env.TRUST_PROXY==="true";
 const source=trusted?request.headers.get("x-forwarded-for")?.split(",")[0]?.trim():"direct-client";
 return `${scope}:${createHash("sha256").update(source??"unknown").digest("hex")}`;
}
export function identifierKey(scope:string,value:string){return `${scope}:${createHash("sha256").update(value).digest("hex")}`}
export async function enforceRateLimit(key:string,limit:number,windowMs:number){
 const now=new Date(), resetAt=new Date(Date.now()+windowMs);
 const bucket=await db.$transaction(async tx=>{
   const current=await tx.rateLimitBucket.findUnique({where:{key}});
   if(!current||current.resetAt<=now)return tx.rateLimitBucket.upsert({where:{key},create:{key,count:1,resetAt},update:{count:1,resetAt}});
   return tx.rateLimitBucket.update({where:{key},data:{count:{increment:1}}});
 });
 return {allowed:bucket.count<=limit,retryAfter:Math.max(1,Math.ceil((bucket.resetAt.getTime()-Date.now())/1000))};
}
export function verifySameOrigin(request:Request){
 const origin=request.headers.get("origin"); if(!origin)return process.env.NODE_ENV!=="production";
 try{return new URL(origin).origin===getAppOrigin()}catch{return false}
}
export function rateLimited(retryAfter:number){return NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Try again later."}},{status:429,headers:{"Retry-After":String(retryAfter)}})}
export function errorResponse(code:string,message:string,status:number){return NextResponse.json({error:{code,message}},{status})}
