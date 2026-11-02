import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  homeForRole,
  verifySessionToken,
} from "@/lib/auth-core";

const PROTECTED_PREFIXES = [
  "/super-admin",
  "/dashboard",
  "/cashier",
  "/products",
  "/categories",
  "/sales",
  "/expenses",
  "/suppliers",
  "/cashiers",
  "/settings",
];

// Owner-only areas. Cashiers are kept in the till and cannot manage the store's
// products, accounts, suppliers, expenses or branding.
const SUPER_ADMIN_PREFIXES = ["/super-admin"];

const OWNER_PREFIXES = [
  "/dashboard",
  "/products",
  "/categories",
  "/expenses",
  "/suppliers",
  "/cashiers",
  "/settings",
];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  // Signed-in users never see the login screen — send them to their home.
  if ((pathname === "/" || pathname === "/login") && session) {
    return NextResponse.redirect(new URL(homeForRole(session.role), request.url));
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    matches(pathname, prefix),
  );

  if (isProtected && !session) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session?.role !== "SUPER_ADMIN" && SUPER_ADMIN_PREFIXES.some((prefix) => matches(pathname, prefix))) {
    return NextResponse.redirect(new URL(homeForRole(session?.role ?? "CASHIER"), request.url));
  }

  // Owners see the dashboard and product management; cashiers go to the till.
  if (session && session.role === "CASHIER") {
    if (OWNER_PREFIXES.some((prefix) => matches(pathname, prefix))) {
      return NextResponse.redirect(new URL("/cashier", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/cashier/:path*",
    "/products/:path*",
    "/categories/:path*",
    "/sales/:path*",
    "/expenses/:path*",
    "/suppliers/:path*",
    "/cashiers/:path*",
    "/settings/:path*",
    "/super-admin/:path*",
  ],
};
