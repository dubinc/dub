import { cookies, headers } from "next/headers";

import { ICustomerBody } from "core/integration/payment/config";
import { ECookieArg } from "core/interfaces/cookie.interface.ts";
import { v4 as uuidv4 } from "uuid";
import { tokenDecode, tokenEncode } from "./user-session-token.service.ts";

// Common cookie settings
const getCookieSettings = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: "/",
});

// apply user session cookie after auth
export const applyUserSession = async (user: ICustomerBody) => {
  const cookieStore = cookies();

  cookieStore.set(ECookieArg.USER, tokenEncode(user), getCookieSettings());
};

// get user cookie
export const getUserCookieService = () => {
  const cookieStore = cookies();

  const user = tokenDecode<ICustomerBody>(
    cookieStore.get(ECookieArg.USER)?.value || "{}",
  );

  const sessionId = cookieStore.get(ECookieArg.SESSION_ID)?.value;

  if (!user?.id) {
    return { user: null, sessionId };
  }

  // Re-apply user session to refresh cookie
  if (user?.id) {
    applyUserSession(user);
  }

  return { user, sessionId };
};

// update user cookie
export const updateUserCookieService = async (body: Partial<ICustomerBody>) => {
  const cookieStore = cookies();
  const headerStore = await headers();

  let user = tokenDecode<ICustomerBody>(
    cookieStore.get(ECookieArg.USER)?.value || "{}",
  );

  if (!user?.id) {
    const userId =
      body?.id || cookieStore.get(ECookieArg.SESSION_ID)?.value || uuidv4();
    const ip =
      headerStore.get("x-real-ip") ||
      headerStore.get("x-forwarded-for") ||
      "127.0.0.1";

    user = {
      id: userId,
      ip: ip?.split(",")?.at(0),
      ...body,
      paymentInfo: { ...body.paymentInfo, customerId: userId },
    };

    cookieStore.set(ECookieArg.USER, tokenEncode(user), getCookieSettings());

    return user;
  }

  user = {
    ...user,
    ...body,
    paymentInfo: { ...user.paymentInfo, ...body.paymentInfo },
    currency: { ...user.currency, ...body.currency },
    sessions: { ...user.sessions, ...body.sessions },
  };

  cookieStore.set(ECookieArg.USER, tokenEncode(user), getCookieSettings());

  return user;
};

// sign out user cookie
export const resetUserCookieService = async () => {
  const cookieStore = cookies();

  cookieStore.set(ECookieArg.USER, "", {
    ...getCookieSettings(),
    maxAge: 0,
  });
};

// sign out user session
export const resetUserSessionId = async () => {
  const cookieStore = cookies();

  cookieStore.set(ECookieArg.SESSION_ID, "", {
    ...getCookieSettings(),
    maxAge: 0,
  });
};
