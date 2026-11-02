import { NextResponse } from "next/server";
import { SESSION_COOKIE, STORE_COOKIE } from "@/lib/auth-core";

/**
 * Clears a session that can no longer be resolved (deleted user, suspended
 * store, bumped session version) before returning to the login screen.
 * Without this, the login screen sees a valid token and redirects back to the
 * protected page, which redirects here again — an infinite loop.
 */
export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(STORE_COOKIE);
  return response;
}
