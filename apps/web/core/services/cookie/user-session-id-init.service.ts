import { NextRequest } from "next/server";

import { createId } from "@/lib/api/utils.ts";
import { ECookieArg } from "core/interfaces/cookie.interface.ts";

export const userSessionIdInit = (request: NextRequest, forceId?: string) => {
  let needsUpdate = false;
  let sessionId = "";

  if (forceId) {
    const currentSessionId = request.cookies.get(ECookieArg.SESSION_ID)?.value;

    if (currentSessionId !== forceId) {
      request.cookies.set(ECookieArg.SESSION_ID, forceId);
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
    }
    sessionId = uuid;
  }

  return {
    needsUpdate,
    sessionId,
    cookieName: ECookieArg.SESSION_ID,
  };
};
