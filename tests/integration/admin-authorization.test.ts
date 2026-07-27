import { describe,expect,it } from "vitest";
import { isAdmin } from "@/lib/admin";
import type { User } from "@/lib/types";
const user=(role:User["role"],status:User["status"]="ACTIVE"):User=>({id:"u",name:"User",email:"user@example.test",emailVerified:true,role,status,sessionVersion:1});
describe("admin authorization",()=>{it("allows only active admins",()=>{expect(isAdmin(user("ADMIN"))).toBe(true);expect(isAdmin(user("STUDENT"))).toBe(false);expect(isAdmin(user("ADMIN","DISABLED"))).toBe(false)})});
