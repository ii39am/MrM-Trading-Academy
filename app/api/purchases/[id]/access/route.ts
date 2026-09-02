import { errorResponse } from "@/lib/security";

export async function GET(){
 return errorResponse("LEGACY_ACCESS_DISABLED","Use the authenticated secure course access action",410);
}
