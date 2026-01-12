import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function isProtectedPath(pathname: string) {
  return (
    pathname === "/generate_reports" ||
    pathname.startsWith("/generate_reports/") ||
    pathname === "/reports" ||
    pathname.startsWith("/reports/") ||
    pathname.startsWith("/api/reports/")
  );
}

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth(); // ✅ in your version auth is a function

  if (isProtectedPath(req.nextUrl.pathname) && !userId) {
    const signInUrl = new URL("/sign-in", req.url);
    // optional: send them back after login
    signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
