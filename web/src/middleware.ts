import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isPublic = PUBLIC_PATHS.some((p) =>
    nextUrl.pathname === p || nextUrl.pathname.startsWith(p + "/")
  );

  if (isPublic) {
    if (isLoggedIn && nextUrl.pathname === "/login") {
      const role = req.auth?.user?.role;
      const target = role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
      return NextResponse.redirect(new URL(target, nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
