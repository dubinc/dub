import { cookies, headers } from "next/headers";

import { ICustomerBody } from "core/integration/payment/config";
import { ECookieArg } from "core/interfaces/cookie.interface.ts";
import { v4 as uuidv4 } from "uuid";
import { tokenDecode, tokenEncode } from "./user-session-token.service.ts";

// get user cookie
export const getUserCookieService = async () => {
  const cookieStore = await cookies();

  const user = tokenDecode<ICustomerBody>(
    cookieStore.get(ECookieArg.USER)?.value || "{}",
  );
  const sessionId = cookieStore.get(ECookieArg.SESSION_ID)?.value;

  if (!user?.id) {
    return { user: null, sessionId };
  }

  return { user, sessionId };
};

// update user cookie
export const updateUserCookieService = async (body: Partial<ICustomerBody>) => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  let user = tokenDecode<ICustomerBody>(
    cookieStore.get(ECookieArg.USER)?.value || "{}",
  );

  if (!user?.id) {
    const userId =
      body?.id || cookieStore.get(ECookieArg.SESSION_ID)?.value || uuidv4();
    const locale = cookieStore.get(ECookieArg.LOCALE)?.value || "en";
    const ip =
      headerStore.get("x-real-ip") ||
      headerStore.get("x-forwarded-for") ||
      "127.0.0.1";

    user = {
      id: userId,
      locale,
      ip: ip?.split(",")?.at(0),
      ...body,
      paymentInfo: { ...body.paymentInfo, customerId: userId },
    };

    cookieStore.set(ECookieArg.USER, tokenEncode(user), { httpOnly: true });

    return user;
  }

  user = {
    ...user,
    ...body,
    locale: cookieStore.get(ECookieArg.LOCALE)?.value || "en",
    paymentInfo: { ...user.paymentInfo, ...body.paymentInfo },
    currency: { ...user.currency, ...body.currency },
    sessions: { ...user.sessions, ...body.sessions },
  };

  cookieStore.set(ECookieArg.USER, tokenEncode(user), { httpOnly: true });

  return user;
};

// apply user session cookie after auth
export const applyUserSession = async (user: ICustomerBody) => {
  const cookieStore = await cookies();

  cookieStore.set(ECookieArg.USER, tokenEncode(user), { httpOnly: true });
};

// sign out user cookie
export const resetUserCookieService = async () => {
  const cookieStore = await cookies();

  cookieStore.set(ECookieArg.USER, "", { httpOnly: true });
};

// sign out user session
export const resetUserSessionId = async () => {
  const cookieStore = await cookies();

  cookieStore.set(ECookieArg.SESSION_ID, "", { httpOnly: true });
};
