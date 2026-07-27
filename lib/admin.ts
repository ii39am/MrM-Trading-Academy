import type { User } from "@/lib/types";
export function isAdmin(user:User|null):user is User{return user?.role==="ADMIN"&&user.status==="ACTIVE"}
