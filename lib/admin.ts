import type { User } from "@/lib/types";
import { db } from "@/lib/db";
export function isAdmin(user:User|null):user is User{return user?.role==="ADMIN"&&user.status==="ACTIVE"}
export function canAccessVideoAdministration(user:User|null){return Boolean(user&&(user.role==="ADMIN"||user.role==="INSTRUCTOR")&&user.status==="ACTIVE")}
export async function canManageLesson(user:User,lessonId:string){
 if(user.role==="ADMIN")return true;
 if(user.role!=="INSTRUCTOR")return false;
 return Boolean(await db.lesson.findFirst({where:{id:lessonId,module:{course:{instructorId:user.id}}},select:{id:true}}));
}
