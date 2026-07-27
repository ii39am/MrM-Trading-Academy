import { db } from "@/lib/db";
export async function GET(){try{await db.$queryRaw`SELECT 1`;return Response.json({status:"ready"})}catch(error){console.error(JSON.stringify({level:"error",event:"database_readiness_failed",error:error instanceof Error?error.name:"unknown"}));return Response.json({status:"not_ready"},{status:503})}}
