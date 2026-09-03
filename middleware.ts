import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { appUrl } from "@/lib/app-url";

const issuer="mr-m-academy", audience="mr-m-web";

function loginRedirect(request: NextRequest) {
  const next = encodeURIComponent(request.nextUrl.pathname);
  return NextResponse.redirect(appUrl(`/login?next=${next}`));
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("mr_m_session")?.value;
  if (!token) return loginRedirect(request);
  try {
    const secret=process.env.JWT_SECRET;
    if(!secret||secret.length<32) throw new Error("Invalid server configuration");
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms:["HS256"], issuer, audience });
    return NextResponse.next();
  } catch {
    const response = loginRedirect(request);
    response.cookies.delete("mr_m_session");
    return response;
  }
}

export const config = { matcher: ["/dashboard/:path*", "/account/:path*", "/admin/:path*"] };
