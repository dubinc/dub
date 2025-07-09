import { NextRequest, NextResponse } from "next/server";
import { userSessionIdInit } from "core/services/cookie/user-session-id-init.service.ts";
import { UserProps } from "@/lib/types.ts";

export function initSessionCookie(req: NextRequest, user?: UserProps) {
  const sessionInit = userSessionIdInit(req, user?.id);
  
  if (sessionInit.needsUpdate) {
    return `${sessionInit.cookieName}=${sessionInit.sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict;`;
  }
  
  return "";
}

export function addSessionCookieToResponse(
  response: NextResponse,
  sessionCookie: string,
  additionalCookies: string[] = []
) {
  if (sessionCookie || additionalCookies.length > 0) {
    const allCookies = [sessionCookie, ...additionalCookies].filter(Boolean);
    if (allCookies.length > 0) {
      response.headers.set("Set-Cookie", allCookies.join(", "));
    }
  }
  return response;
} 