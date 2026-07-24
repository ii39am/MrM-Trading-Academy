import { db } from "@/lib/db";

export async function requireEnrollment(userId:string,courseSlug:string){
 return db.enrollment.findFirst({where:{userId,purchase:{status:"PAID"},course:{slug:courseSlug,status:"PUBLISHED"}},select:{id:true,courseId:true}});
}
export async function requireLessonEnrollment(userId:string,lessonId:string){
 return db.enrollment.findFirst({where:{userId,purchase:{status:"PAID"},course:{status:"PUBLISHED",publishedAt:{lte:new Date()},modules:{some:{lessons:{some:{id:lessonId,publishedAt:{not:null}}}}}}},select:{id:true}});
}
