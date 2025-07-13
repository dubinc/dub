import { NextRequest, NextResponse } from "next/server";
import { userSessionIdInit } from "core/services/cookie/user-session-id-init.service.ts";
import { UserProps } from "@/lib/types.ts";

export function initSessionCookie(req: NextRequest, response: NextResponse, user?: UserProps) {
  return userSessionIdInit(req, response, user?.id);
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