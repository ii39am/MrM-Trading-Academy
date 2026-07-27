import { db } from "@/lib/db";

export async function requireEnrollment(userId:string,courseSlug:string){
 return db.enrollment.findFirst({where:{userId,purchase:{status:"PAID"},course:{slug:courseSlug,status:"PUBLISHED"}},select:{id:true,courseId:true}});
}
