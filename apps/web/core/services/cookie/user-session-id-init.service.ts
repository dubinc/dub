import { NextRequest } from "next/server";

import { createId } from "@/lib/api/utils.ts";
import { ECookieArg } from "core/interfaces/cookie.interface.ts";

export const userSessionIdInit = (request: NextRequest, forceId?: string) => {
  let needsUpdate = false;
  let sessionId = "";
  let needsSourceCookie = false;

  // Check if URL contains the specific query parameter
  const idParam = request.nextUrl.searchParams.get("id");
  if (idParam === "7kQ9mL2nP5xR8wY3vZ1t") {
    const existingSourceCookie = request.cookies.get(ECookieArg.SOURCE)?.value;
    if (existingSourceCookie !== "paid") {
      needsSourceCookie = true;
      request.cookies.set(ECookieArg.SOURCE, "paid");
    }
  }

  // const cookieSettings = {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === "production",
  //   path: "/",
  //   sameSite: "strict" as const,
  // };

  if (forceId) {
    const currentSessionId = request.cookies.get(ECookieArg.SESSION_ID)?.value;

    if (currentSessionId !== forceId) {
      request.cookies.set(ECookieArg.SESSION_ID, forceId);
      // response.cookies.set(ECookieArg.SESSION_ID, forceId, cookieSettings);
      sessionId = forceId;
      needsUpdate = true;
    } else {
      sessionId = currentSessionId;
    }
  } else {
    let uuid = request.cookies.get(ECookieArg.SESSION_ID)?.value || "";

    if (!uuid) {
      uuid = createId({ prefix: "user_" });
      needsUpdate = true;
      request.cookies.set(ECookieArg.SESSION_ID, uuid);
      // response.cookies.set(ECookieArg.SESSION_ID, uuid, cookieSettings);
    }
    sessionId = uuid;
  }

  return {
    needsUpdate,
    sessionId,
    cookieName: ECookieArg.SESSION_ID,
    needsSourceCookie,
    sourceCookieName: ECookieArg.SOURCE,
    sourceCookieValue: "paid",
  };
};
