import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const issuer="mr-m-academy", audience="mr-m-web";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("mr_m_session")?.value;
  if (!token) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url));
  try {
    const secret=process.env.JWT_SECRET;
    if(!secret||secret.length<32) throw new Error("Invalid server configuration");
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms:["HS256"], issuer, audience });
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("mr_m_session");
    return response;
  }
}

export const config = { matcher: ["/dashboard/:path*", "/learn/:path*", "/admin/:path*"] };
