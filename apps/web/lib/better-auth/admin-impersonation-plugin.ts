import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";
import { createVerificationToken } from "./verification-token";

function buildVerifyUrl(origin: string, token: string, callbackURL: string) {
  const url = new URL("/api/auth/magic-link/verify", origin);
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", callbackURL);
  return url.toString();
}

export async function createImpersonationUrls(email: string) {
  const [{ token: appToken }, { token: partnersToken }] = await Promise.all([
    createVerificationToken({
      kind: "adminImpersonation",
      value: {
        email,
        isAdminImpersonation: true,
      },
    }),

    createVerificationToken({
      kind: "adminImpersonation",
      value: {
        email,
        isAdminImpersonation: true,
      },
    }),
  ]);

  return {
    app: buildVerifyUrl(APP_DOMAIN, appToken, APP_DOMAIN),
    partners: buildVerifyUrl(PARTNERS_DOMAIN, partnersToken, PARTNERS_DOMAIN),
  };
}
