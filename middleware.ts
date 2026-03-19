import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { canAccessArea } from "@/lib/permissions";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const area = pathname.startsWith("/portal")
    ? "portal"
    : pathname.startsWith("/workspace")
      ? "workspace"
      : pathname.startsWith("/admin")
        ? "admin"
        : null;

  if (!area) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });

  if (!token?.roleCode) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!canAccessArea(area, token.roleCode as never)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/workspace/:path*", "/admin/:path*"]
};
