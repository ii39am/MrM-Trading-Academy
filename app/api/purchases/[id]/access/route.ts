import { getSessionUser } from "@/lib/auth";
import { errorResponse } from "@/lib/security";
import { getTelegramAccess } from "@/lib/purchase-access";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await getSessionUser();if(!user)return errorResponse("UNAUTHORIZED","Authentication required",401);
 const courseId=new URL(request.url).searchParams.get("courseId");if(!courseId)return errorResponse("INVALID_INPUT","Product is required",400);
 const destination=await getTelegramAccess(user.id,(await params).id,courseId);if(!destination)return errorResponse("ACCESS_UNAVAILABLE","Product access is unavailable",404);
 return Response.redirect(destination,303);
}
